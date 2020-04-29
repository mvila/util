import {clone} from 'simple-cloning';
import {isPrototypeOf} from 'core-helpers';
import isObjectLike from 'lodash/isObjectLike';

export type mergeOptions = {
  objectMerger?: (object: object, forkedObject: object) => object | void;
  objectCloner?: (object: object) => object | void;
};

export function merge(value: any, forkedValue: any, options?: mergeOptions) {
  if (isObjectLike(value) && isObjectLike(forkedValue) && isPrototypeOf(value, forkedValue)) {
    return mergeObject(value, forkedValue, options);
  }

  if (typeof value === 'function' || typeof forkedValue === 'function') {
    throw new Error('Cannot merge a function');
  }

  return clone(forkedValue, options);
}

function mergeObject(object: object, forkedObject: object, options?: mergeOptions) {
  const objectMerger = options?.objectMerger;

  if (objectMerger !== undefined) {
    const mergedObject = objectMerger(object, forkedObject);

    if (mergedObject !== undefined) {
      return mergedObject;
    }
  }

  mergeAttributes(object, forkedObject, options);

  return object;
}

function mergeAttributes(
  object: {[key: string]: any},
  forkedObject: object,
  options?: mergeOptions
) {
  for (const [name, forkedValue] of Object.entries(forkedObject)) {
    const value = object[name];

    object[name] = merge(value, forkedValue, options);
  }
}
