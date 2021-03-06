import isObjectLike from 'lodash/isObjectLike';
import mapValues from 'lodash/mapValues';

export type CloneOptions = {objectCloner?: (object: object) => object | void};

export function clone(value: any, options?: CloneOptions): any {
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

function cloneObject(object: object, options?: CloneOptions) {
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

function cloneArray(array: any[], options?: CloneOptions) {
  return array.map((item) => clone(item, options));
}

function cloneDate(date: Date) {
  return new Date(date);
}

function cloneRegExp(regExp: RegExp) {
  return new RegExp(regExp.source, regExp.flags);
}

function cloneError(error: Error, options?: CloneOptions) {
  const clonedError = new Error(error.message);

  Object.assign(clonedError, cloneAttributes(error, options));

  return clonedError;
}

function cloneAttributes(object: object, options?: CloneOptions) {
  return mapValues(object, (value) => clone(value, options));
}
