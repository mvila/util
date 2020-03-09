import mapValues from 'lodash/mapValues';
import ow from 'ow';

export function fork(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({objectHandler: ow.optional.function}));

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return forkArray(value, options);
  }

  if (typeof value === 'object') {
    return forkObject(value, options);
  }

  if (typeof value === 'function') {
    throw new Error('Cannot fork a function');
  }

  return value;
}

function forkObject(object, options) {
  const objectHandler = options?.objectHandler;

  if (objectHandler !== undefined) {
    const forkedObject = objectHandler(object);

    if (forkedObject !== undefined) {
      return forkedObject;
    }
  }

  if (object instanceof Date) {
    return forkDate(object);
  }

  if (object instanceof RegExp) {
    return forkRegExp(object);
  }

  if (object instanceof Error) {
    return forkError(object, options);
  }

  return forkAttributes(object, options);
}

function forkDate(date) {
  return new Date(date);
}

function forkRegExp(regExp) {
  return new RegExp(regExp.source, regExp.flags);
}

function forkError(error, options) {
  const forkedError = new Error(error.message);

  Object.assign(forkedError, forkAttributes(error, options));

  return forkedError;
}

function forkAttributes(object, options) {
  // OPTIMIZE: Consider using a proxy to lazily fork the attributes
  return mapValues(object, value => fork(value, options));
}

function forkArray(array, options) {
  // OPTIMIZE: Consider using a proxy to lazily fork the items
  return array.map(item => fork(item, options));
}
