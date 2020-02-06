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
    return new Date(object.value);
  }

  const objectHandler = options?.objectHandler;

  if (objectHandler !== undefined) {
    const deserializedObject = objectHandler(object);

    if (deserializedObject !== undefined) {
      return deserializedObject;
    }
  }

  return possiblyAsync.mapObject(object, value => deserialize(value, options));
}

function deserializeArray(array, options) {
  return possiblyAsync.map(array, item => deserialize(item, options));
}
