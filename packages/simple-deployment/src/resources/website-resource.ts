import {Constructor} from 'core-helpers';

import {Resource, ResourceConfig} from './resource';
import {mergeConfigSchema} from './config-schema';

export type WebsiteResourceConfig = ResourceConfig & {
  files: string[];
  immutableFiles: string[];
  indexPage: string;
  customErrors: {
    errorCode: number;
    responseCode: number;
    responsePage: string;
  }[];
};

export type Environment = {[name: string]: string};

export function WebsiteResource<T extends Constructor<typeof Resource>>(Base: T) {
  class WebsiteResource extends Base {
    static getConfigSchema() {
      return mergeConfigSchema(super.getConfigSchema(), {
        properties: {
          files: {type: 'array', items: {type: 'string'}},
          immutableFiles: {type: 'array', items: {type: 'string'}, default: ['**/*.immutable.*']},
          indexPage: {type: 'string', default: 'index.html'},
          customErrors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                errorCode: {type: 'number'},
                responseCode: {type: 'number'},
                responsePage: {type: 'string'}
              },
              required: ['errorCode', 'responseCode', 'responsePage'],
              additionalProperties: false
            },
            default: []
          }
        },
        required: ['files']
      });
    }
  }

  return WebsiteResource;
}
