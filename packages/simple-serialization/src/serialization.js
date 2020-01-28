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

  return value;
}

function serializeObject(object, {objectHandler, ...options} = {}) {
  if (objectHandler !== undefined) {
    const serializedObject = objectHandler(object);

    if (serializedObject !== undefined) {
      return serializedObject;
    }
  }

  if (object instanceof Date) {
    return {__class: 'Date', value: object.toISOString()};
  }

  if (typeof object.toJSON === 'function') {
    return object.toJSON();
  }

  return possiblyAsync.mapObject(object, value => serialize(value, options));
}

function serializeArray(array, options) {
  return possiblyAsync.map(array, item => serialize(item, options));
}
