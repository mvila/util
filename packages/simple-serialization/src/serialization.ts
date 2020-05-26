import {PlainObject} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';

export type SerializeOptions = {
  objectSerializer?: (object: object) => object | void;
  functionSerializer?: (object: Function) => object | void;
};

export type SerializeResult<Value> = Value extends undefined
  ? ReturnType<typeof serializeUndefined>
  : Value extends Date
  ? ReturnType<typeof serializeDate>
  : Value extends RegExp
  ? ReturnType<typeof serializeRegExp>
  : Value extends Error
  ? ReturnType<typeof serializeError>
  : Value extends Array<infer Element>
  ? Array<SerializeResult<Element>>
  : Value extends object
  ? object
  : Value;

export function serialize<Value>(value: Value, options?: SerializeOptions): SerializeResult<Value>;
export function serialize(value: any, options?: SerializeOptions): any {
  if (value === undefined) {
    return serializeUndefined();
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return serializeArray(value, options);
  }

  if (typeof value === 'object' || typeof value === 'function') {
    return serializeObjectOrFunction(value, options);
  }

  if (Number.isNaN(value)) {
    throw new Error('Cannot serialize a NaN value');
  }

  return value;
}

export function serializeUndefined(): {__undefined: true} {
  return {__undefined: true};
}

function serializeObjectOrFunction(object: object, options?: SerializeOptions) {
  const objectSerializer = options?.objectSerializer;

  if (objectSerializer !== undefined) {
    const serializedObject = objectSerializer(object);

    if (serializedObject !== undefined) {
      return serializedObject;
    }
  }

  const functionSerializer = options?.functionSerializer;

  if (typeof object === 'function' && functionSerializer !== undefined) {
    const serializedFunction = functionSerializer(object);

    if (serializedFunction !== undefined) {
      return serializedFunction;
    }
  }

  if (object instanceof Date) {
    return serializeDate(object);
  }

  if (object instanceof RegExp) {
    return serializeRegExp(object);
  }

  if (object instanceof Error) {
    return serializeError(object, options);
  }

  if (typeof (object as any).toJSON === 'function') {
    return serialize((object as any).toJSON(), options);
  }

  return serializeAttributes(object, options);
}

export function serializeDate(date: Date) {
  if (isNaN(date.valueOf())) {
    throw new Error('Cannot serialize an invalid date');
  }

  return {__date: date.toISOString()};
}

export function serializeRegExp(regExp: RegExp) {
  return {__regExp: regExp.toString()};
}

export function serializeError(
  error: Error,
  options?: SerializeOptions
): {__error: string} & PlainObject {
  const serializedError = {__error: error.message};

  return possiblyAsync(serializeAttributes(error, options), (serializedAttributes) => {
    Object.assign(serializedError, serializedAttributes);
    return serializedError;
  });
}

function serializeAttributes(object: PlainObject, options?: SerializeOptions) {
  return possiblyAsync.mapValues(object, (value) => serialize(value, options));
}

function serializeArray(array: unknown[], options?: SerializeOptions) {
  return possiblyAsync.map(array, (item) => serialize(item, options));
}
