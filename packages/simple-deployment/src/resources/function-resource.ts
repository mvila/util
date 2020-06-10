import {Constructor} from 'core-helpers';

import {Resource, ResourceConfig} from './resource';
import {mergeConfigSchema} from './config-schema';

export type FunctionResourceConfig = ResourceConfig & {
  files: string[];
  main: string;
  includeDependencies: boolean;
  environment: Environment;
};

export type Environment = {[name: string]: string};

export function FunctionResource<T extends Constructor<typeof Resource>>(Base: T) {
  class FunctionResource extends Base {
    static getConfigSchema() {
      return mergeConfigSchema(super.getConfigSchema(), {
        properties: {
          files: {type: 'array', items: {type: 'string'}},
          main: {type: 'string'},
          includeDependencies: {type: 'boolean', default: false},
          environment: {type: 'object', additionalProperties: {type: 'string'}, default: {}}
        },
        required: ['files', 'main']
      });
    }
  }

  return FunctionResource;
}
