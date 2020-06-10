import AWS from 'aws-sdk';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';
import isEqual from 'lodash/isEqual';
import takeRight from 'lodash/takeRight';
import trimEnd from 'lodash/trimEnd';
import sleep from 'sleep-promise';

import {Resource, ResourceConfig, MANAGER_IDENTIFIER} from '../resource';
import {mergeConfigSchema} from '../config-schema';
import {logMessage, throwError} from '../../util';

const DEFAULT_ROUTE_53_TTL = 300;

export type AWSResourceConfig = ResourceConfig & {
  aws: {
    region: string;
    profile?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
};

export class AWSResource extends Resource {
  static getConfigSchema() {
    return mergeConfigSchema(super.getConfigSchema(), {
      properties: {
        aws: {
          type: 'object',
          properties: {
            region: {type: 'string'},
            profile: {type: 'string'},
            accessKeyId: {type: 'string'},
            secretAccessKey: {type: 'string'}
          },
          required: ['region'],
          additionalProperties: false
        }
      }
    });
  }

  _config!: AWSResourceConfig;

  // === IAM ===

  _iamClient!: AWS.IAM;

  getIAMClient() {
    if (this._iamClient === undefined) {
      this._iamClient = new AWS.IAM({...this.buildAWSConfig(), apiVersion: '2010-05-08'});
    }

    return this._iamClient;
  }

  // === Lambda ===

  _lambdaClient!: AWS.Lambda;

  getLambdaClient() {
    if (this._lambdaClient === undefined) {
      this._lambdaClient = new AWS.Lambda({...this.buildAWSConfig(), apiVersion: '2015-03-31'});
    }

    return this._lambdaClient;
  }

  // === API Gateway v2 ===

  _apiGatewayV2Client!: AWS.ApiGatewayV2;

  getAPIGatewayV2Client() {
    if (this._apiGatewayV2Client === undefined) {
      this._apiGatewayV2Client = new AWS.ApiGatewayV2({
        ...this.buildAWSConfig(),
        apiVersion: '2018-11-29'
      });
    }

    return this._apiGatewayV2Client;
  }

  // === Route 53 ===

  _route53HostedZone?: {id: string};

  async getRoute53HostedZone({throwIfMissing = true} = {}) {
    const config = this.getConfig();

    if (this._route53HostedZone === undefined) {
      const hostedZone = await this.findRoute53HostedZone(config.domainName);

      if (hostedZone !== undefined) {
        this._route53HostedZone = {id: hostedZone.Id};
      }
    }

    if (this._route53HostedZone === undefined && throwIfMissing) {
      throwError(
        `Couldn't get the Route 53 hosted zone. Please make sure your domain name is hosted by Route 53.`
      );
    }

    return this._route53HostedZone;
  }

  async ensureRoute53CNAME({name, value}: {name: string; value: string}) {
    const route53 = this.getRoute53Client();

    logMessage(`Checking the Route53 CNAME...`);

    name = trimEnd(name, '.');
    value = trimEnd(value, '.');

    const hostedZone = (await this.getRoute53HostedZone())!;

    const recordSet = await this.findRoute53RecordSet({
      hostedZoneId: hostedZone.id,
      name,
      type: 'CNAME'
    });

    let isMissingOrDifferent = false;

    if (recordSet === undefined) {
      logMessage(`Creating the Route53 CNAME...`);
      isMissingOrDifferent = true;
    } else if (recordSet.ResourceRecords?.[0]?.Value !== value) {
      logMessage(`Updating the Route53 CNAME...`);
      isMissingOrDifferent = true;
    }

    if (isMissingOrDifferent) {
      const {
        ChangeInfo: {Id: changeId}
      } = await route53
        .changeResourceRecordSets({
          HostedZoneId: hostedZone.id,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: name + '.',
                  Type: 'CNAME',
                  ResourceRecords: [{Value: value}],
                  TTL: DEFAULT_ROUTE_53_TTL
                }
              }
            ]
          }
        })
        .promise();

      await this.waitForRoute53RecordSetChange(changeId);
    }

    return true;
  }

  async ensureRoute53Alias({
    name,
    targetDomainName,
    targetHostedZoneId
  }: {
    name: string;
    targetDomainName: string;
    targetHostedZoneId: string;
  }) {
    const route53 = this.getRoute53Client();

    name = trimEnd(name, '.');
    targetDomainName = trimEnd(targetDomainName, '.');

    logMessage(`Checking the Route53 Alias...`);

    const hostedZone = (await this.getRoute53HostedZone())!;

    const recordSet = await this.findRoute53RecordSet({
      hostedZoneId: hostedZone.id,
      name,
      type: 'A'
    });

    let isMissingOrDifferent = false;

    if (recordSet === undefined) {
      logMessage(`Creating the Route53 Alias...`);
      isMissingOrDifferent = true;
    } else if (recordSet.AliasTarget?.DNSName !== targetDomainName + '.') {
      logMessage(`Updating the Route53 Alias...`);
      isMissingOrDifferent = true;
    }

    if (isMissingOrDifferent) {
      const {
        ChangeInfo: {Id: changeId}
      } = await route53
        .changeResourceRecordSets({
          HostedZoneId: hostedZone.id,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: name + '.',
                  Type: 'A',
                  AliasTarget: {
                    DNSName: targetDomainName + '.',
                    HostedZoneId: targetHostedZoneId,
                    EvaluateTargetHealth: false
                  }
                }
              }
            ]
          }
        })
        .promise();

      await this.waitForRoute53RecordSetChange(changeId);
    }

    return true;
  }

  async findRoute53HostedZone(domainName: string) {
    const route53 = this.getRoute53Client();

    logMessage(`Searching for the Route 53 hosted zone...`);

    const dnsName = takeRight(domainName.split('.'), 2).join('.');

    const result = await route53.listHostedZonesByName({DNSName: dnsName}).promise();

    let bestHostedZone: AWS.Route53.HostedZone | undefined;

    for (const hostedZone of result.HostedZones) {
      if (
        domainName + '.' === hostedZone.Name ||
        (domainName + '.').endsWith('.' + hostedZone.Name)
      ) {
        if (bestHostedZone === undefined || hostedZone.Name.length > bestHostedZone.Name.length) {
          bestHostedZone = hostedZone;
        }
      }
    }

    if (bestHostedZone !== undefined) {
      return bestHostedZone;
    }

    if (result.IsTruncated) {
      throwError(
        `Whoa, you have a lot of Route 53 hosted zones! Unfortunately, this tool cannot list them all.`
      );
    }

    return undefined;
  }

  async findRoute53RecordSet({
    hostedZoneId,
    name,
    type
  }: {
    hostedZoneId: string;
    name: string;
    type: string;
  }) {
    const route53 = this.getRoute53Client();

    logMessage(`Searching for the Route 53 record set...`);

    name += '.';

    const result = await route53
      .listResourceRecordSets({
        HostedZoneId: hostedZoneId,
        StartRecordName: name,
        StartRecordType: type
      })
      .promise();

    const recordSet = result.ResourceRecordSets.find(
      (recordSet) => recordSet.Name === name && recordSet.Type === type
    );

    if (recordSet) {
      return recordSet;
    }

    if (result.IsTruncated) {
      throwError(
        `Whoa, you have a lot of Route 53 record sets! Unfortunately, this tool cannot list them all.`
      );
    }

    return undefined;
  }

  async waitForRoute53RecordSetChange(changeId: string) {
    const route53 = this.getRoute53Client();

    logMessage(`Waiting for the Route 53 record set change to complete...`);

    let totalSleepTime = 0;
    const maxSleepTime = 3 * 60 * 1000; // 3 minutes
    const sleepTime = 5000; // 5 seconds

    do {
      await sleep(sleepTime);
      totalSleepTime += sleepTime;

      const result = await route53.getChange({Id: changeId}).promise();

      if (result.ChangeInfo.Status !== 'PENDING') {
        return;
      }
    } while (totalSleepTime <= maxSleepTime);

    throwError(`Route 53 record set change uncompleted after ${totalSleepTime / 1000} seconds`);
  }

  _route53Client!: AWS.Route53;

  getRoute53Client() {
    if (this._route53Client === undefined) {
      this._route53Client = new AWS.Route53({...this.buildAWSConfig(), apiVersion: '2013-04-01'});
    }

    return this._route53Client;
  }

  // === ACM ===

  async ensureACMCertificate() {
    logMessage(`Checking the ACM Certificate...`);

    let certificate = await this.getACMCertificate({throwIfMissing: false});

    if (certificate === undefined) {
      certificate = await this.createACMCertificate();
    }

    return certificate;
  }

  _acmCertificate?: {arn: string};

  async getACMCertificate({throwIfMissing = true} = {}) {
    const config = this.getConfig();

    if (this._acmCertificate === undefined) {
      const certificate = await this.findACMCertificate(config.domainName);

      if (certificate !== undefined) {
        const arn = certificate.CertificateArn!;

        if (certificate.Status === 'PENDING_VALIDATION') {
          await this.waitForACMCertificateValidation(arn);
        }

        this._acmCertificate = {arn};
      }
    }

    if (this._acmCertificate === undefined && throwIfMissing) {
      throwError(`Couldn't get the ACM Certificate`);
    }

    return this._acmCertificate;
  }

  async createACMCertificate() {
    const config = this.getConfig();
    const acm = this.getACMClient();

    logMessage(`Creating the ACM Certificate...`);

    const result = await acm
      .requestCertificate({
        DomainName: config.domainName,
        ValidationMethod: 'DNS',
        Tags: [{Key: 'managed-by', Value: MANAGER_IDENTIFIER}]
      })
      .promise();
    const arn = result.CertificateArn!;

    const validationCNAME = await this.getACMCertificateValidationCNAME(arn);

    await this.ensureRoute53CNAME(validationCNAME);

    await this.waitForACMCertificateValidation(arn);

    this._acmCertificate = {arn};

    return this._acmCertificate;
  }

  async findACMCertificate(domainName: string) {
    const acm = this.getACMClient();

    let rootDomainName: string | undefined;

    const parts = domainName.split('.');

    if (parts.length > 2) {
      rootDomainName = parts.slice(1).join('.');
    }

    const result = await acm
      .listCertificates({
        CertificateStatuses: ['ISSUED', 'PENDING_VALIDATION'],
        Includes: {
          // We need the following because 'RSA_4096' is not included by default
          keyTypes: [
            'RSA_2048',
            'RSA_1024',
            'RSA_4096',
            'EC_prime256v1',
            'EC_secp384r1',
            'EC_secp521r1'
          ]
        },
        MaxItems: 1000
      })
      .promise();

    const certificates = result.CertificateSummaryList!.filter((certificate) => {
      if (certificate.DomainName === domainName) {
        return true;
      }

      if (rootDomainName !== undefined) {
        if (certificate.DomainName === '*.' + rootDomainName) {
          return true;
        }
      }

      return false;
    });

    let bestCertificates: AWS.ACM.CertificateDetail[] = [];
    const bestCertificatesMatchedName = new Map<AWS.ACM.CertificateDetail, string>();

    for (let certificate of certificates) {
      const result = await acm
        .describeCertificate({CertificateArn: certificate.CertificateArn!})
        .promise();
      const certificateDetail: AWS.ACM.CertificateDetail = result.Certificate!;

      let matchedName;

      for (const name of certificateDetail.SubjectAlternativeNames!) {
        if (
          name === domainName ||
          (rootDomainName !== undefined && name === '*.' + rootDomainName)
        ) {
          if (matchedName === undefined || matchedName.length < name.length) {
            matchedName = name;
          }
        }
      }

      if (matchedName !== undefined) {
        bestCertificatesMatchedName.set(certificateDetail, matchedName);
        bestCertificates.push(certificateDetail);
      }
    }

    bestCertificates = sortBy(
      bestCertificates,
      (certificate) => -bestCertificatesMatchedName.get(certificate)!.length
    );

    for (const certificate of bestCertificates) {
      if (certificate.Status === 'ISSUED') {
        return certificate;
      }
    }

    for (const certificate of bestCertificates) {
      if (certificate.Status === 'PENDING_VALIDATION') {
        const result = await acm
          .listTagsForCertificate({
            CertificateArn: certificate.CertificateArn!
          })
          .promise();
        if (
          result.Tags!.some((tag) => isEqual(tag, {Key: 'managed-by', Value: MANAGER_IDENTIFIER}))
        ) {
          return certificate;
        }
      }
    }

    if (result.NextToken) {
      throwError(
        `Whoa, you have a lot of ACM Certificates! Unfortunately, this tool cannot list them all.`
      );
    }

    return undefined;
  }

  async getACMCertificateValidationCNAME(arn: string) {
    const acm = this.getACMClient();

    logMessage(`Getting the ACM Certificate DNS Validation record...`);

    let totalSleepTime = 0;
    const maxSleepTime = 60 * 1000; // 1 minute
    const sleepTime = 5 * 1000; // 5 seconds

    do {
      await sleep(sleepTime);
      totalSleepTime += sleepTime;

      const {Certificate: certificate} = await acm
        .describeCertificate({
          CertificateArn: arn
        })
        .promise();
      const record = certificate?.DomainValidationOptions?.[0].ResourceRecord;

      if (record?.Type === 'CNAME') {
        return {name: record.Name, value: record.Value};
      }
    } while (totalSleepTime <= maxSleepTime);

    throwError(
      `Couldn't get the ACM Certificate DNS Validation record after ${
        totalSleepTime / 1000
      } seconds`
    );
  }

  async waitForACMCertificateValidation(arn: string) {
    const acm = this.getACMClient();

    logMessage(`Waiting for the ACM Certificate validation...`);

    let totalSleepTime = 0;
    const maxSleepTime = 60 * 60 * 1000; // 1 hour
    const sleepTime = 10000; // 10 seconds

    do {
      await sleep(sleepTime);
      totalSleepTime += sleepTime;

      const result = await acm
        .describeCertificate({
          CertificateArn: arn
        })
        .promise();

      if (result.Certificate?.Status === 'ISSUED') {
        return;
      }
    } while (totalSleepTime <= maxSleepTime);

    throw throwError(
      `ACM Certificate has not been validated after ${totalSleepTime / 1000} seconds`
    );
  }

  _acmClient!: AWS.ACM;

  getACMClient() {
    if (this._acmClient === undefined) {
      this._acmClient = new AWS.ACM({
        ...this.buildAWSConfig(),
        apiVersion: '2015-12-08'
      });
    }

    return this._acmClient;
  }

  // === AWS Config ===

  buildAWSConfig() {
    const {aws: awsConfig} = this.getConfig();

    let credentials: {accessKeyId?: string; secretAccessKey?: string} = {};

    if (awsConfig.profile !== undefined) {
      const profileCredentials = new AWS.SharedIniFileCredentials({profile: awsConfig.profile});
      credentials = pick(profileCredentials, ['accessKeyId', 'secretAccessKey']);
    }

    return {
      ...credentials,
      ...pick(awsConfig, ['accessKeyId', 'secretAccessKey', 'region']),
      signatureVersion: 'v4'
    };
  }
}
