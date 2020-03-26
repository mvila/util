import isObjectLike from 'lodash/isObjectLike';
import mapValues from 'lodash/mapValues';
import ow from 'ow';

export function clone(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({objectCloner: ow.optional.function}));

  if (Array.isArray(value)) {
    return cloneArray(value, options);
  }

  if (isObjectLike(value)) {
    return cloneObject(value, options);
  }

  if (typeof value === 'function') {
    throw new Error('Cannot clone a function');
  }

  return value;
}

function cloneObject(object, options) {
  const objectCloner = options?.objectCloner;

  if (objectCloner !== undefined) {
    const clonedObject = objectCloner(object);

    if (clonedObject !== undefined) {
      return clonedObject;
    }
  }

  if (object instanceof Date) {
    return cloneDate(object);
  }

  if (object instanceof RegExp) {
    return cloneRegExp(object);
  }

  if (object instanceof Error) {
    return cloneError(object, options);
  }

  return cloneAttributes(object, options);
}

function cloneDate(date) {
  return new Date(date);
}

function cloneRegExp(regExp) {
  return new RegExp(regExp.source, regExp.flags);
}

function cloneError(error, options) {
  const clonedError = new Error(error.message);

  Object.assign(clonedError, cloneAttributes(error, options));

  return clonedError;
}

function cloneAttributes(object, options) {
  return mapValues(object, value => clone(value, options));
}

function cloneArray(array, options) {
  return array.map(item => clone(item, options));
}
