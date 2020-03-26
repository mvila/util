import {hasOwnProperty} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export function deserialize(value, options) {
  ow(
    options,
    'options',
    ow.optional.object.partialShape({
      objectDeserializer: ow.optional.function,
      functionDeserializer: ow.optional.function
    })
  );

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
  const objectDeserializer = options?.objectDeserializer;

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
    return deserializeError(object, options);
  }

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

function deserializeDate(object) {
  return new Date(object.__date);
}

function deserializeRegExp(object) {
  const {__regExp: regExp} = object;

  const fragments = regExp.match(/\/(.*?)\/([a-z]*)?$/i);

  if (fragments === null) {
    throw new Error(`Cannot deserialize an invalid RegExp ('${regExp}')`);
  }

  const [, source, flags] = fragments;

  return new RegExp(source, flags);
}

function deserializeError(object, options) {
  const {__error: message, ...attributes} = object;

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
