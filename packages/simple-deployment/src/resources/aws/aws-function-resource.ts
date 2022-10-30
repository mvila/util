import {promises as fsAsync} from 'fs';
import {copy, remove, pathExists, readJSONSync, writeJSONSync} from 'fs-extra';
import {execFileSync} from 'child_process';
import {join, resolve, sep} from 'path';
// @ts-ignore
import zip from 'cross-zip';
import temporaryDirectoryRoot from 'temp-dir';
import hasha from 'hasha';
import isEqual from 'lodash/isEqual';
import sleep from 'sleep-promise';
import bytes from 'bytes';

import {MANAGER_IDENTIFIER} from '../resource';
import {AWSResource, AWSResourceConfig} from './aws-resource';
import {FunctionResource, FunctionResourceConfig, Environment} from '../function-resource';
import {mergeConfigSchema} from '../config-schema';
import {logMessage, throwError} from '../../util';

const DEFAULT_LAMBDA_RUNTIME = 'nodejs12.x';
const DEFAULT_LAMBDA_MEMORY_SIZE = 128;
const DEFAULT_LAMBDA_TIMEOUT = 10;

const DEFAULT_API_GATEWAY_CORS_CONFIGURATION = {
  AllowOrigins: ['*'],
  AllowHeaders: ['content-type'],
  AllowMethods: ['GET', 'POST', 'OPTIONS'],
  ExposeHeaders: ['*'],
  MaxAge: 3600 // 1 hour
};

const DEFAULT_IAM_LAMBDA_ROLE_NAME = `${MANAGER_IDENTIFIER}-function-lambda-role-v1`;
const DEFAULT_IAM_LAMBDA_POLICY_NAME = 'basic-lambda-policy';

const DEFAULT_IAM_LAMBDA_ASSUME_ROLE_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com'
      },
      Action: 'sts:AssumeRole'
    }
  ]
};

const DEFAULT_IAM_LAMBDA_POLICY_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: ['logs:*'],
      Effect: 'Allow',
      Resource: '*'
    }
  ]
};

export type AWSFunctionResourceConfig = AWSResourceConfig &
  FunctionResourceConfig & {
    aws: {
      lambda: {
        runtime: string;
        executionRole: string;
        memorySize: number;
        timeout: number;
        reservedConcurrentExecutions?: number;
      };
    };
  };

export type Tags = {[name: string]: string};

export class AWSFunctionResource extends FunctionResource(AWSResource) {
  static getConfigSchema() {
    return mergeConfigSchema(super.getConfigSchema(), {
      properties: {
        aws: {
          properties: {
            lambda: {
              type: 'object',
              properties: {
                runtime: {type: 'string', default: DEFAULT_LAMBDA_RUNTIME},
                executionRole: {type: 'string', default: DEFAULT_IAM_LAMBDA_ROLE_NAME},
                memorySize: {type: 'number', default: DEFAULT_LAMBDA_MEMORY_SIZE},
                timeout: {type: 'number', default: DEFAULT_LAMBDA_TIMEOUT},
                reservedConcurrentExecutions: {type: 'number'}
              },
              default: {},
              additionalProperties: false
            }
          }
        }
      }
    });
  }

  _config!: AWSFunctionResourceConfig;

  async deploy() {
    const config = this.getConfig();

    await super.deploy();

    logMessage(`Starting the deployment of a function to AWS...`);

    await this.getRoute53HostedZone();
    await this.ensureIAMLambdaRole();
    await this.createOrUpdateLambdaFunction();
    await this.ensureACMCertificate();
    await this.createOrUpdateAPIGateway();
    await this.createOrUpdateAPIGatewayCustomDomainName();

    logMessage(`Deployment completed`);
    logMessage(`The function should be available at https://${config.domainName}`);
  }

  // === Lambda ===

  async createOrUpdateLambdaFunction() {
    logMessage('Checking the Lambda function...');

    const lambdaFunction = await this.getLambdaFunction({throwIfMissing: false});

    if (lambdaFunction === undefined) {
      await this.createLambdaFunction();
      await this.setLambdaFunctionTags();
      return;
    }

    await this.checkLambdaFunctionTags();

    if (await this.checkIfLambdaFunctionCodeHasChanged()) {
      await this.updateLambdaFunctionCode();
    } else {
      logMessage(`The Lambda function code was unchanged`);
    }

    if (await this.checkIfLambdaFunctionConfigurationHasChanged()) {
      await this.updateLambdaFunctionConfiguration();
    }

    if (await this.checkIfLambdaFunctionConcurrencyHasChanged()) {
      await this.updateLambdaFunctionConcurrency();
    }
  }

  _lambdaFunction?: {
    arn: string;
    runtime?: string;
    memorySize?: number;
    timeout?: number;
    reservedConcurrentExecutions?: number;
    environment?: Environment;
    codeSHA256?: string;
    tags?: Tags;
  };

  async getLambdaFunction({throwIfMissing = true} = {}) {
    if (this._lambdaFunction === undefined) {
      const lambda = this.getLambdaClient();

      try {
        const result = await lambda
          .getFunction({
            FunctionName: this.getLambdaName()
          })
          .promise();

        const config = result.Configuration!;

        this._lambdaFunction = {
          arn: config.FunctionArn!,
          runtime: config.Runtime!,
          memorySize: config.MemorySize!,
          timeout: config.Timeout!,
          reservedConcurrentExecutions: result.Concurrency?.ReservedConcurrentExecutions,
          environment: config.Environment?.Variables ?? {},
          codeSHA256: config.CodeSha256!,
          tags: result.Tags!
        };
      } catch (err: any) {
        if (err.code !== 'ResourceNotFoundException') {
          throw err;
        }
      }
    }

    if (this._lambdaFunction === undefined && throwIfMissing) {
      throwError(`Couldn't get the Lambda function`);
    }

    return this._lambdaFunction;
  }

  async createLambdaFunction() {
    const config = this.getConfig();
    const lambda = this.getLambdaClient();
    const role = (await this.getIAMLambdaRole())!;
    const zipArchive = await this.getZipArchive();

    logMessage(`Creating the Lambda function (${bytes(zipArchive.length)})...`);

    let errors = 0;

    while (this._lambdaFunction === undefined) {
      try {
        const lambdaFunction = await lambda
          .createFunction({
            FunctionName: this.getLambdaName(),
            Handler: 'handler.handler',
            Runtime: config.aws.lambda.runtime,
            Role: role.arn,
            MemorySize: config.aws.lambda.memorySize,
            Timeout: config.aws.lambda.timeout,
            Environment: {Variables: config.environment},
            Code: {ZipFile: zipArchive}
          })
          .promise();

        this._lambdaFunction = {arn: lambdaFunction.FunctionArn!};
      } catch (err: any) {
        const roleMayNotBeReady = err.code === 'InvalidParameterValueException' && ++errors <= 10;

        if (!roleMayNotBeReady) {
          throw err;
        }

        await sleep(3000);
      }
    }

    if (config.aws.lambda.reservedConcurrentExecutions !== undefined) {
      await this.updateLambdaFunctionConcurrency();
    }
  }

  async checkLambdaFunctionTags() {
    const lambdaFunction = (await this.getLambdaFunction())!;

    if (lambdaFunction.tags?.['managed-by'] !== MANAGER_IDENTIFIER) {
      throwError(
        `Cannot update a Lambda function that was not originally created by this tool (function: '${this.getLambdaName()}')`
      );
    }
  }

  async setLambdaFunctionTags() {
    const lambda = this.getLambdaClient();
    const lambdaFunction = (await this.getLambdaFunction())!;

    await lambda
      .tagResource({
        Resource: lambdaFunction.arn,
        Tags: {'managed-by': MANAGER_IDENTIFIER}
      })
      .promise();
  }

  async checkIfLambdaFunctionConfigurationHasChanged() {
    const config = this.getConfig();
    const lambdaFunction = (await this.getLambdaFunction())!;

    if (lambdaFunction.runtime !== config.aws.lambda.runtime) {
      return true;
    }

    if (lambdaFunction.memorySize !== config.aws.lambda.memorySize) {
      return true;
    }

    if (lambdaFunction.timeout !== config.aws.lambda.timeout) {
      return true;
    }

    if (!isEqual(lambdaFunction.environment, config.environment)) {
      return true;
    }

    return false;
  }

  async updateLambdaFunctionConfiguration() {
    const config = this.getConfig();
    const lambda = this.getLambdaClient();

    logMessage('Updating the Lambda function configuration...');

    await lambda
      .updateFunctionConfiguration({
        FunctionName: this.getLambdaName(),
        Runtime: config.aws.lambda.runtime,
        MemorySize: config.aws.lambda.memorySize,
        Timeout: config.aws.lambda.timeout,
        Environment: {Variables: config.environment}
      })
      .promise();
  }

  async checkIfLambdaFunctionConcurrencyHasChanged() {
    const config = this.getConfig();
    const lambdaFunction = (await this.getLambdaFunction())!;

    return (
      lambdaFunction.reservedConcurrentExecutions !== config.aws.lambda.reservedConcurrentExecutions
    );
  }

  async updateLambdaFunctionConcurrency() {
    const config = this.getConfig();
    const lambda = this.getLambdaClient();

    logMessage('Updating the Lambda function concurrency...');

    if (config.aws.lambda.reservedConcurrentExecutions === undefined) {
      await lambda.deleteFunctionConcurrency({FunctionName: this.getLambdaName()}).promise();
    } else {
      await lambda
        .putFunctionConcurrency({
          FunctionName: this.getLambdaName(),
          ReservedConcurrentExecutions: config.aws.lambda.reservedConcurrentExecutions
        })
        .promise();
    }
  }

  async checkIfLambdaFunctionCodeHasChanged() {
    const lambdaFunction = (await this.getLambdaFunction())!;
    const zipArchive = await this.getZipArchive();
    const zipArchiveSHA256 = hasha(zipArchive, {encoding: 'base64', algorithm: 'sha256'});

    return lambdaFunction.codeSHA256 !== zipArchiveSHA256;
  }

  async updateLambdaFunctionCode() {
    const lambda = this.getLambdaClient();
    const zipArchive = await this.getZipArchive();

    logMessage(`Updating the Lambda function code (${bytes(zipArchive.length)})...`);

    await lambda
      .updateFunctionCode({
        FunctionName: this.getLambdaName(),
        ZipFile: zipArchive
      })
      .promise();
  }

  _zipArchive!: Buffer;

  async getZipArchive() {
    if (this._zipArchive === undefined) {
      const config = this.getConfig();

      logMessage(`Building the ZIP archive...`);

      const temporaryDirectory = join(
        temporaryDirectoryRoot,
        MANAGER_IDENTIFIER,
        this.getLambdaName()
      );

      try {
        const codeDirectory = join(temporaryDirectory, 'code');
        const zipArchiveFile = join(temporaryDirectory, 'archive.zip');

        for (const fileOrDirectory of config.files) {
          await copy(resolve(config.directory, fileOrDirectory), codeDirectory);
        }

        if (config.includeDependencies) {
          await this.includeNPMDependencies(codeDirectory);
        }

        await this.resetFileTimes(codeDirectory);
        zip.zipSync(`${codeDirectory}${sep}.`, zipArchiveFile);
        this._zipArchive = await fsAsync.readFile(zipArchiveFile);
      } finally {
        await remove(temporaryDirectory);
      }
    }

    return this._zipArchive;
  }

  async includeNPMDependencies(codeDirectory: string) {
    // TODO: Cache the installed dependencies

    const config = this.getConfig();

    logMessage(`Including the dependencies...`);

    const packageFile = join(config.directory, 'package.json');

    if (!(await pathExists(packageFile))) {
      throwError(`Couldn't find a 'package.json' file (directory: '${config.directory}')`);
    }

    const {dependencies} = readJSONSync(packageFile);
    const generatedPackageFile = join(codeDirectory, 'package.json');
    writeJSONSync(generatedPackageFile, {
      // Include valid 'description', 'license', and 'repository' to suppress NPM warnings
      description: '...',
      license: 'MIT', // No worries, the license is not persisted in the deployed Lambda
      repository: '...',
      dependencies
    });

    try {
      execFileSync('npm', ['install'], {cwd: codeDirectory});
    } catch {
      throwError('An error occurred while running `npm`');
    }

    await remove(generatedPackageFile);
  }

  async resetFileTimes(directory: string) {
    const fixedDate = new Date(Date.UTC(1984, 0, 24));
    const entries = await fsAsync.readdir(directory, {withFileTypes: true});

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);

      await fsAsync.utimes(entryPath, fixedDate, fixedDate);

      if (entry.isDirectory()) {
        await this.resetFileTimes(entryPath);
      }
    }
  }

  async allowLambdaFunctionInvocationFromAPIGateway() {
    const config = this.getConfig();
    const lambda = this.getLambdaClient();
    const lambdaFunction = (await this.getLambdaFunction())!;
    const apiGateway = (await this.getAPIGateway())!;

    const matches = /arn:aws:.+:.+:(\d+):/.exec(lambdaFunction.arn);
    const accountId = matches?.[1];

    if (!accountId) {
      throwError('Unable to find out the AWS account ID');
    }

    const sourceARN = `arn:aws:execute-api:${config.aws.region}:${accountId}:${apiGateway.id}/*/*`;

    await lambda
      .addPermission({
        FunctionName: lambdaFunction.arn,
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        StatementId: 'allow_api_gateway',
        SourceArn: sourceARN
      })
      .promise();
  }

  getLambdaName() {
    return this.getConfig().domainName.replace(/\./g, '-');
  }

  // === IAM for Lambda ===

  async ensureIAMLambdaRole() {
    logMessage('Checking the IAM Lambda role...');

    if ((await this.getIAMLambdaRole({throwIfMissing: false})) === undefined) {
      logMessage('Creating the IAM Lambda role...');

      await this.createIAMLambdaRole();
    }
  }

  _iamLambdaRole?: {arn: string};

  async getIAMLambdaRole({throwIfMissing = true}: {throwIfMissing?: boolean} = {}) {
    if (this._iamLambdaRole === undefined) {
      const iam = this.getIAMClient();

      try {
        const result = await iam
          .getRole({RoleName: this.getConfig().aws.lambda.executionRole})
          .promise();
        this._iamLambdaRole = {arn: result.Role.Arn};
      } catch (err: any) {
        if (err.code !== 'NoSuchEntity') {
          throw err;
        }
      }
    }

    if (this._iamLambdaRole === undefined && throwIfMissing) {
      throwError(`Couldn't get the IAM Lambda role`);
    }

    return this._iamLambdaRole;
  }

  async createIAMLambdaRole() {
    const iam = this.getIAMClient();

    const assumeRolePolicyDocument = JSON.stringify(
      DEFAULT_IAM_LAMBDA_ASSUME_ROLE_POLICY_DOCUMENT,
      undefined,
      2
    );

    const {
      Role: {Arn: arn}
    } = await iam
      .createRole({
        RoleName: this.getConfig().aws.lambda.executionRole,
        AssumeRolePolicyDocument: assumeRolePolicyDocument
      })
      .promise();

    const policyDocument = JSON.stringify(DEFAULT_IAM_LAMBDA_POLICY_DOCUMENT, undefined, 2);

    await iam
      .putRolePolicy({
        RoleName: this.getConfig().aws.lambda.executionRole,
        PolicyName: DEFAULT_IAM_LAMBDA_POLICY_NAME,
        PolicyDocument: policyDocument
      })
      .promise();

    await sleep(3000); // Wait 3 secs so AWS can replicate the role in all regions

    this._iamLambdaRole = {arn};
  }

  // === API Gateway ===

  async createOrUpdateAPIGateway() {
    logMessage(`Checking the API Gateway...`);

    const api = await this.getAPIGateway({throwIfMissing: false});

    if (api === undefined) {
      await this.createAPIGateway();
      await this.allowLambdaFunctionInvocationFromAPIGateway();
    } else {
      await this.checkAPIGatewayTags();
    }
  }

  _apiGateway?: {id: string; endpoint: string; tags: {[name: string]: string}};

  async getAPIGateway({throwIfMissing = true} = {}) {
    if (this._apiGateway === undefined) {
      const apiGateway = this.getAPIGatewayV2Client();

      const result = await apiGateway.getApis().promise();
      const item = result.Items?.find((item) => item.Name === this.getAPIGatewayName());

      if (item !== undefined) {
        this._apiGateway = {id: item.ApiId!, endpoint: item.ApiEndpoint!, tags: item.Tags!};
      } else if (result.NextToken) {
        throwError(
          `Whoa, you have a lot of API Gateways! Unfortunately, this tool cannot list them all.`
        );
      }
    }

    if (this._apiGateway === undefined && throwIfMissing) {
      throwError(`Couldn't find the API Gateway`);
    }

    return this._apiGateway;
  }

  async createAPIGateway() {
    const apiGateway = this.getAPIGatewayV2Client();

    logMessage(`Creating the API Gateway...`);

    const tags = {'managed-by': MANAGER_IDENTIFIER};

    const result = await apiGateway
      .createApi({
        Name: this.getAPIGatewayName(),
        ProtocolType: 'HTTP',
        Target: (await this.getLambdaFunction())!.arn,
        CorsConfiguration: DEFAULT_API_GATEWAY_CORS_CONFIGURATION,
        Tags: tags
      })
      .promise();

    this._apiGateway = {id: result.ApiId!, endpoint: result.ApiEndpoint!, tags};
  }

  async checkAPIGatewayTags() {
    const api = (await this.getAPIGateway())!;

    if (api.tags['managed-by'] !== MANAGER_IDENTIFIER) {
      throwError(
        `Cannot use an API Gateway that was not originally created by this tool (name: '${this.getAPIGatewayName()}')`
      );
    }
  }

  async createOrUpdateAPIGatewayCustomDomainName() {
    const config = this.getConfig();

    logMessage(`Checking the API Gateway custom domain name...`);

    let customDomainName = await this.getAPIGatewayCustomDomainName({throwIfMissing: false});

    if (customDomainName === undefined) {
      customDomainName = await this.createAPIGatewayCustomDomainName();
    }

    const targetDomainName = customDomainName.apiGatewayDomainName;
    const targetHostedZoneId = customDomainName.hostedZoneId;
    await this.ensureRoute53Alias({name: config.domainName, targetDomainName, targetHostedZoneId});
  }

  _apiGatewayCustomDomainName?: {
    domainName: string;
    apiGatewayDomainName: string;
    hostedZoneId: string;
  };

  async getAPIGatewayCustomDomainName({throwIfMissing = true} = {}) {
    if (!this._apiGatewayCustomDomainName) {
      const config = this.getConfig();
      const apiGateway = this.getAPIGatewayV2Client();

      let result;

      try {
        result = await apiGateway
          .getDomainName({
            DomainName: config.domainName
          })
          .promise();
      } catch (err: any) {
        if (err.code !== 'NotFoundException') {
          throw err;
        }
      }

      if (result !== undefined) {
        this._apiGatewayCustomDomainName = {
          domainName: result.DomainName!,
          apiGatewayDomainName: result.DomainNameConfigurations![0].ApiGatewayDomainName!,
          hostedZoneId: result.DomainNameConfigurations![0].HostedZoneId!
        };
      }
    }

    if (this._apiGatewayCustomDomainName === undefined && throwIfMissing) {
      throwError('API Gateway custom domain name not found');
    }

    return this._apiGatewayCustomDomainName;
  }

  async createAPIGatewayCustomDomainName() {
    const config = this.getConfig();
    const apiGateway = this.getAPIGatewayV2Client();

    logMessage(`Creating the API Gateway custom domain name...`);

    const api = (await this.getAPIGateway())!;
    const certificate = (await this.getACMCertificate())!;

    const result = await apiGateway
      .createDomainName({
        DomainName: config.domainName,
        DomainNameConfigurations: [
          {
            ApiGatewayDomainName: api.endpoint,
            CertificateArn: certificate.arn,
            EndpointType: 'REGIONAL',
            SecurityPolicy: 'TLS_1_2'
          }
        ]
      })
      .promise();

    await apiGateway
      .createApiMapping({ApiId: api.id, DomainName: config.domainName, Stage: '$default'})
      .promise();

    this._apiGatewayCustomDomainName = {
      domainName: result.DomainName!,
      apiGatewayDomainName: result.DomainNameConfigurations![0].ApiGatewayDomainName!,
      hostedZoneId: result.DomainNameConfigurations![0].HostedZoneId!
    };

    return this._apiGatewayCustomDomainName;
  }

  getAPIGatewayName() {
    return this.getConfig().domainName;
  }
}
