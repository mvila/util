import {clone, isLeaf} from 'simple-cloning';
import isObjectLike from 'lodash/isObjectLike';

export type ForkOptions = {objectForker?: (object: object) => object | void};

export function fork(value: any, options?: ForkOptions): any {
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

function forkObject(object: object, options?: ForkOptions) {
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

function forkArray(array: any[], options?: ForkOptions) {
  // OPTIMIZE: Consider using a proxy to lazily fork the items
  return array.map((item) => fork(item, options));
}

function forkAttributes(object: object, options?: ForkOptions) {
  const forkedObject = Object.create(object);

  // OPTIMIZE: Consider using a proxy to lazily fork the attributes
  for (const [name, value] of Object.entries(object)) {
    forkedObject[name] = fork(value, options);
  }

  return forkedObject;
}
