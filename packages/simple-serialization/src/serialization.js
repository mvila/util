import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export function serialize(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({objectHandler: ow.optional.function}));

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

function serializeObjectOrFunction(object, options) {
  const objectHandler = options?.objectHandler;
  const functionHandler = options?.functionHandler;

  if (objectHandler !== undefined) {
    const serializedObject = objectHandler(object);

    if (serializedObject !== undefined) {
      return serializedObject;
    }
  }

  if (typeof object === 'function' && functionHandler !== undefined) {
    const serializedFunction = functionHandler(object);

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

  if (typeof object.toJSON === 'function') {
    return serialize(object.toJSON(), options);
  }

  return serializeAttributes(object, options);
}

function serializeDate(date) {
  if (isNaN(date.valueOf())) {
    throw new Error('Cannot serialize an invalid date');
  }

  return {__date: date.toISOString()};
}

function serializeRegExp(regExp) {
  return {__regExp: regExp.toString()};
}

function serializeError(error, options) {
  const serializedError = {__error: error.message};

  return possiblyAsync(serializeAttributes(error, options), {
    then: serializedAttributes => {
      Object.assign(serializedError, serializedAttributes);
      return serializedError;
    }
  });
}

function serializeAttributes(object, options) {
  return possiblyAsync.mapValues(object, value => serialize(value, options));
}

function serializeArray(array, options) {
  return possiblyAsync.map(array, item => serialize(item, options));
}
