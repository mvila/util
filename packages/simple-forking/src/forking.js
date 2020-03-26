import {clone, isLeaf} from 'simple-cloning';
import isObjectLike from 'lodash/isObjectLike';
import ow from 'ow';

export function fork(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({objectForker: ow.optional.function}));

  if (Array.isArray(value)) {
    return forkArray(value, options);
  }

  if (isObjectLike(value)) {
    return forkObject(value, options);
  }

  if (typeof value === 'function') {
    throw new Error('Cannot fork a function');
  }

  return value;
}

function forkObject(object, options) {
  const objectForker = options?.objectForker;

  if (objectForker !== undefined) {
    const forkedObject = objectForker(object);

    if (forkedObject !== undefined) {
      return forkedObject;
    }
  }

  if (isLeaf(object)) {
    return clone(object);
  }

  return forkAttributes(object, options);
}

function forkAttributes(object, options) {
  const forkedObject = Object.create(object);

  // OPTIMIZE: Consider using a proxy to lazily fork the attributes
  for (const [name, value] of Object.entries(object)) {
    forkedObject[name] = fork(value, options);
  }

  return forkedObject;
}

function forkArray(array, options) {
  // OPTIMIZE: Consider using a proxy to lazily fork the items
  return array.map(item => fork(item, options));
}
