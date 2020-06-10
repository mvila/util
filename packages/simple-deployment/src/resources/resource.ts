import {normalizeConfigWithSchema} from './config-schema';

export const MANAGER_IDENTIFIER = 'simple-deployment-v1';

export type ResourceConfig = {
  directory: string;
  type: string;
  provider: string;
  domainName: string;
};

export class Resource {
  ['constructor']!: typeof Resource;

  static getConfigSchema() {
    return {
      type: 'object',
      properties: {
        directory: {type: 'string'},
        type: {type: 'string'},
        provider: {type: 'string'},
        domainName: {type: 'string'}
      },
      required: ['directory', 'type', 'provider', 'domainName'],
      additionalProperties: false
    } as any;
  }

  _config: ResourceConfig;

  constructor(config: ResourceConfig) {
    this._config = this.constructor.normalizeConfig(config);
  }

  static normalizeConfig(config: ResourceConfig, {removeAdditional = false} = {}) {
    return normalizeConfigWithSchema(config, this.getConfigSchema(), {removeAdditional});
  }

  getConfig<T extends Resource>(this: T) {
    return this._config as T['_config'];
  }

  async deploy() {}
}
