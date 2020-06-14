import {Resource, ResourceConfig} from './resource';
import {AWSWebsiteResource} from './aws/aws-website-resource';
import {AWSFunctionResource} from './aws/aws-function-resource';
import {throwError} from '../util';

export function createResource(config: ResourceConfig) {
  const baseConfig = Resource.normalizeConfig(config, {removeAdditional: true});

  const {type, provider} = baseConfig;

  if (type === 'website') {
    if (provider === 'aws') {
      return new AWSWebsiteResource(config);
    }

    throwError(`The provider '${provider}' is not supported for the resource type 'website'`);
  }

  if (type === 'function') {
    if (provider === 'aws') {
      return new AWSFunctionResource(config);
    }

    throwError(`The provider '${provider}' is not supported for the resource type 'function'`);
  }

  throwError(`The resource type '${type}' is not supported'`);
}
