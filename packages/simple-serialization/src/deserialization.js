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
    return deserializeObject(value, options);
  }

  return value;
}

function deserializeObject(object, options) {
  if (object.__undefined === true) {
    return undefined;
  }

  if (object.__class === 'Date') {
    return deserializeDate(object);
  }

  if (object.__class === 'Function') {
    return deserializeFunction(object, options);
  }

  if (object.__class === 'Error') {
    return deserializeError(object, options);
  }

  const objectHandler = options?.objectHandler;

  if (objectHandler !== undefined) {
    const deserializedObject = objectHandler(object);

    if (deserializedObject !== undefined) {
      return deserializedObject;
    }
  }

  return deserializeAttributes(object, options);
}

function deserializeDate(object) {
  return new Date(object.__value);
}

function deserializeFunction(object, options) {
  const {__class: _, __value: functionCode, ...attributes} = object;

  // eslint-disable-next-line no-new-func
  const deserializedFunction = new Function(`return ${functionCode}`)();

  return possiblyAsync(deserializeAttributes(attributes, options), {
    then: deserializedAttributes => {
      Object.assign(deserializedFunction, deserializedAttributes);
      return deserializedFunction;
    }
  });
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
