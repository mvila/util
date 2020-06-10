import Ajv from 'ajv';
import cloneDeep from 'lodash/cloneDeep';
import mergeWith from 'lodash/mergeWith';

import {throwError} from '../util';

export function normalizeConfigWithSchema(
  config: any,
  schema: object,
  {removeAdditional = false} = {}
) {
  config = cloneDeep(config);

  const ajv = new Ajv({useDefaults: true, removeAdditional});
  const isValid = ajv.validate(schema, config);

  if (!isValid) {
    throwError(`The configuration is invalid (${ajv.errorsText(undefined, {dataVar: 'config'})})`);
  }

  return config;
}

export function mergeConfigSchema(schema: object, otherSchema: object) {
  return mergeWith(cloneDeep(schema), otherSchema, (value, otherValue) =>
    Array.isArray(value) ? [...value, ...otherValue] : undefined
  );
}
