import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export function deserialize(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({objectHandler: ow.optional.function}));

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

function deserializeObjectOrFunction(object, options) {
  const objectHandler = options?.objectHandler;
  const functionHandler = options?.functionHandler;

  if (object.__undefined === true) {
    return undefined;
  }

  if (object.__class === 'Date') {
    return deserializeDate(object);
  }

  if (object.__class === 'Error') {
    return deserializeError(object, options);
  }

  if (objectHandler !== undefined) {
    const deserializedObject = objectHandler(object);

    if (deserializedObject !== undefined) {
      return deserializedObject;
    }
  }

  if (functionHandler !== undefined) {
    const deserializedFunction = functionHandler(object);

    if (deserializedFunction !== undefined) {
      return deserializedFunction;
    }
  }

  return deserializeAttributes(object, options);
}

function deserializeDate(object) {
  return new Date(object.__value);
}

function deserializeError(object, options) {
  const {__class: _, message, ...attributes} = object;

  const deserializedError = new Error(message);

  return possiblyAsync(deserializeAttributes(attributes, options), {
    then: deserializedAttributes => {
      Object.assign(deserializedError, deserializedAttributes);
      return deserializedError;
    }
  });
}

function deserializeAttributes(object, options) {
  return possiblyAsync.mapValues(object, value => deserialize(value, options));
}

function deserializeArray(array, options) {
  return possiblyAsync.map(array, item => deserialize(item, options));
}
