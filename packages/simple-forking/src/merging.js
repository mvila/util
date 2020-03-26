import {clone} from 'simple-cloning';
import {isPrototypeOf} from 'core-helpers';
import isObjectLike from 'lodash/isObjectLike';
import ow from 'ow';

export function merge(value, forkedValue, options) {
  ow(
    options,
    'options',
    ow.optional.object.partialShape({
      objectMerger: ow.optional.function,
      objectCloner: ow.optional.function
    })
  );

  if (isObjectLike(value) && isObjectLike(forkedValue) && isPrototypeOf(value, forkedValue)) {
    return mergeObject(value, forkedValue, options);
  }

  if (typeof value === 'function' || typeof forkedValue === 'function') {
    throw new Error('Cannot merge a function');
  }

  return clone(forkedValue, options);
}

function mergeObject(object, forkedObject, options) {
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

function mergeAttributes(object, forkedObject, options) {
  for (const [name, forkedValue] of Object.entries(forkedObject)) {
    const value = object[name];

    object[name] = merge(value, forkedValue, options);
  }
}
