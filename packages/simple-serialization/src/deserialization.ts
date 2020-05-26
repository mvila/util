import {hasOwnProperty, PlainObject} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';

import {serializeUndefined, serializeDate, serializeRegExp, serializeError} from './serialization';

export type DeserializeOptions = {
  objectDeserializer?: (object: PlainObject) => object | void;
  functionDeserializer?: (object: PlainObject) => Function | void;
  errorHandler?: (error: Error) => unknown;
};

export type DeserializeResult<Value> = Value extends ReturnType<typeof serializeUndefined>
  ? undefined
  : Value extends ReturnType<typeof serializeDate>
  ? Date
  : Value extends ReturnType<typeof serializeRegExp>
  ? RegExp
  : Value extends ReturnType<typeof serializeError>
  ? Error
  : Value extends Array<infer Element>
  ? Array<DeserializeResult<Element>>
  : Value extends object
  ? object
  : Value;

export function deserialize<Value>(
  value: Value,
  options?: DeserializeOptions
): DeserializeResult<Value>;
export function deserialize(value: any, options?: DeserializeOptions): any {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return deserializeArray(value, options);
  }

  if (typeof value === 'object') {
    return deserializeObjectOrFunction(value, options);
  }

  return value;
}

function deserializeObjectOrFunction(object: PlainObject, options?: DeserializeOptions) {
  if (hasOwnProperty(object, '__undefined') && object.__undefined === true) {
    return undefined;
  }

  if (hasOwnProperty(object, '__date')) {
    return deserializeDate(object);
  }

  if (hasOwnProperty(object, '__regExp')) {
    return deserializeRegExp(object);
  }

  if (hasOwnProperty(object, '__error')) {
    return possiblyAsync(deserializeError(object, options), (error) => {
      const errorHandler = options?.errorHandler;

      if (errorHandler !== undefined) {
        return errorHandler(error);
      }

      return error;
    });
  }

  const objectDeserializer = options?.objectDeserializer;

  if (objectDeserializer !== undefined) {
    const deserializedObject = objectDeserializer(object);

    if (deserializedObject !== undefined) {
      return deserializedObject;
    }
  }

  const functionDeserializer = options?.functionDeserializer;

  if (functionDeserializer !== undefined) {
    const deserializedFunction = functionDeserializer(object);

    if (deserializedFunction !== undefined) {
      return deserializedFunction;
    }
  }

  return deserializeAttributes(object, options);
}

function deserializeDate(object: PlainObject) {
  return new Date(object.__date);
}

function deserializeRegExp(object: PlainObject) {
  const {__regExp: regExp} = object;

  const fragments = regExp.match(/\/(.*?)\/([a-z]*)?$/i);

  if (fragments === null) {
    throw new Error(`Cannot deserialize an invalid RegExp ('${regExp}')`);
  }

  const [, source, flags] = fragments;

  return new RegExp(source, flags);
}

function deserializeError(object: PlainObject, options?: DeserializeOptions) {
  const {__error: message, ...attributes} = object;

  const deserializedError = new Error(message);

  return possiblyAsync(deserializeAttributes(attributes, options), (deserializedAttributes) => {
    Object.assign(deserializedError, deserializedAttributes);
    return deserializedError;
  });
}

function deserializeAttributes(object: PlainObject, options?: DeserializeOptions) {
  return possiblyAsync.mapValues(object, (value) => deserialize(value, options));
}

function deserializeArray(array: any[], options?: DeserializeOptions) {
  return possiblyAsync.map(array, (item) => deserialize(item, options));
}
