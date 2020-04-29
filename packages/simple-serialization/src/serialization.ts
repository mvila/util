import {possiblyAsync} from 'possibly-async';

export type serializeOptions = {
  objectSerializer?: (object: object) => object | void;
  functionSerializer?: (object: Function) => object | void;
};

export function serialize(value: any, options?: serializeOptions): any {
  if (value === undefined) {
    return {__undefined: true};
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

function serializeObjectOrFunction(object: object, options?: serializeOptions) {
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

function serializeDate(date: Date) {
  if (isNaN(date.valueOf())) {
    throw new Error('Cannot serialize an invalid date');
  }

  return {__date: date.toISOString()};
}

function serializeRegExp(regExp: RegExp) {
  return {__regExp: regExp.toString()};
}

function serializeError(error: Error, options?: serializeOptions) {
  const serializedError = {__error: error.message};

  return possiblyAsync(serializeAttributes(error, options), {
    then: (serializedAttributes) => {
      Object.assign(serializedError, serializedAttributes);
      return serializedError;
    }
  });
}

function serializeAttributes(object: object, options?: serializeOptions) {
  return possiblyAsync.mapValues(object, (value) => serialize(value, options));
}

function serializeArray(array: any[], options?: serializeOptions) {
  return possiblyAsync.map(array, (item) => serialize(item, options));
}
