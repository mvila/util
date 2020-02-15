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
    return serializeObject(value, options);
  }

  if (Number.isNaN(value)) {
    throw new Error('Cannot serialize a NaN value');
  }

  return value;
}

function serializeObject(object, options) {
  const objectHandler = options?.objectHandler;

  if (objectHandler !== undefined) {
    const serializedObject = objectHandler(object);

    if (serializedObject !== undefined) {
      return serializedObject;
    }
  }

  if (object instanceof Date) {
    return serializeDate(object);
  }

  if (typeof object === 'function') {
    return serializeFunction(object, options);
  }

  if (object instanceof Error) {
    return serializeError(object, options);
  }

  if (typeof object.toJSON === 'function') {
    return object.toJSON();
  }

  return serializeAttributes(object, options);
}

function serializeDate(date) {
  if (isNaN(date.valueOf())) {
    throw new Error('Cannot serialize an invalid date');
  }

  return {__class: 'Date', __value: date.toISOString()};
}

function serializeFunction(func, options) {
  const functionCode = func.toString();

  if (functionCode.startsWith('class')) {
    throw new Error('Cannot serialize a class');
  }

  const serializedFunction = {
    __class: 'Function',
    __value: functionCode
  };

  return possiblyAsync(serializeAttributes(func, options), {
    then: serializedAttributes => {
      Object.assign(serializedFunction, serializedAttributes);
      return serializedFunction;
    }
  });
}

function serializeError(error, options) {
  const serializedError = {__class: 'Error'};

  // Since the 'message' property is not enumerable, we must get it manually
  if (typeof error.message === 'string' && error.message !== '') {
    serializedError.message = error.message;
  }

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
