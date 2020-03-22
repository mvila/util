import isPlainObject from 'lodash/isPlainObject';
import lowerFirst from 'lodash/lowerFirst';

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

export function getFunctionName(func, {humanize = false} = {}) {
  if (typeof func !== 'function') {
    throw new Error(`Expected a function, but received a value of type '${typeof func}'`);
  }

  let name = humanize ? func.humanName : undefined;

  if (name !== undefined) {
    return name;
  }

  name = func.displayName;

  if (name !== undefined) {
    return name;
  }

  name = func.name;

  if (name !== undefined) {
    return name;
  }

  // Source: https://github.com/sindresorhus/fn-name
  name = (/function ([^(]+)?\(/.exec(func.toString()) || [])[1];

  if (name !== undefined) {
    return name;
  }

  return '';
}

export function getTypeOf(value, {humanize = false} = {}) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return lowerFirst(getFunctionName(value.constructor, {humanize}) || 'Object');
  }

  if (isES2015Class(value)) {
    return getFunctionName(value, {humanize}) || 'Object';
  }

  return typeof value;
}

export function getHumanTypeOf(value) {
  return getTypeOf(value, {humanize: true});
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

export function forEachDeep(value, iteratee, {nameOrIndex, objectOrArray} = {}) {
  const isObject = isPlainObject(value);
  const isArray = Array.isArray(value);

  if (!(isObject || isArray)) {
    return iteratee(value, nameOrIndex, objectOrArray);
  }

  if (isObject) {
    const object = value;

    for (const [name, value] of Object.entries(object)) {
      const result = forEachDeep(value, iteratee, {nameOrIndex: name, objectOrArray: object});

      if (result === breakSymbol) {
        return breakSymbol;
      }
    }
  }

  if (isArray) {
    const array = value;

    for (const [index, value] of array.entries()) {
      const result = forEachDeep(value, iteratee, {nameOrIndex: index, objectOrArray: array});

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

export function deleteUndefinedProperties(value) {
  forEachDeep(value, function(value, nameOrIndex, objectOrArray) {
    if (value === undefined && nameOrIndex !== undefined && !Array.isArray(objectOrArray)) {
      delete objectOrArray[nameOrIndex];
    }
  });

  return value;
}
