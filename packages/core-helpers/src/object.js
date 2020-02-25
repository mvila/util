import isPlainObject from 'lodash/isPlainObject';
import lowerFirst from 'lodash/lowerFirst';
import fnName from 'fn-name';

export function hasOwnProperty(object, name) {
  return _hasOwnProperty.call(object, name);
}

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function isPrototypeOf(object, other) {
  return _isPrototypeOf.call(object, other);
}

const _isPrototypeOf = Object.prototype.isPrototypeOf;

export function propertyIsEnumerable(object, name) {
  return _propertyIsEnumerable.call(object, name);
}

const _propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

export function getPropertyDescriptor(object, name) {
  if (!((typeof object === 'object' && object !== null) || typeof object === 'function')) {
    return undefined;
  }

  if (!(name in object)) {
    return undefined;
  }

  while (object !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) {
      return descriptor;
    }
    object = Object.getPrototypeOf(object);
  }
}

export function getInheritedPropertyDescriptor(object, name) {
  const prototype = Object.getPrototypeOf(object);
  return getPropertyDescriptor(prototype, name);
}

export function getFunctionName(func) {
  return fnName(func) ?? '';
}

export function getTypeOf(value) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return lowerFirst(getFunctionName(value.constructor) || 'Object');
  }

  if (isES2015Class(value)) {
    return getFunctionName(value) || 'Object';
  }

  return typeof value;
}

export function isClass(value) {
  return typeof value === 'function' && hasOwnProperty(value, 'prototype');
}

export function isES2015Class(value) {
  return typeof value === 'function' && value.toString().startsWith('class');
}

export function isInstance(value) {
  return !isClass(value);
}

export function getClassOf(value) {
  if (isClass(value)) {
    return value;
  }

  return value?.constructor;
}

export function getInstanceOf(value) {
  if (isInstance(value)) {
    return value;
  }

  return value.prototype;
}

export const breakSymbol = Symbol('break');

export function forEachDeep(value, iteratee) {
  const isObject = isPlainObject(value);
  const isArray = Array.isArray(value);

  if (!(isObject || isArray)) {
    return iteratee(value);
  }

  if (isObject) {
    const object = value;

    for (const value of Object.values(object)) {
      const result = forEachDeep(value, iteratee);

      if (result === breakSymbol) {
        return breakSymbol;
      }
    }
  }

  if (isArray) {
    const array = value;

    for (const value of Object.values(array)) {
      const result = forEachDeep(value, iteratee);

      if (result === breakSymbol) {
        return breakSymbol;
      }
    }
  }
}

export function someDeep(value, predicate) {
  const result = forEachDeep(value, function(value) {
    if (predicate(value)) {
      return breakSymbol;
    }
  });

  return result === breakSymbol;
}
