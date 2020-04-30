import isPlainObject from 'lodash/isPlainObject';
import isObjectLike from 'lodash/isObjectLike';
import {Class} from 'type-fest';

import {getTypeOf} from './utilities';

export function hasOwnProperty(object: Object, name: string | number | symbol) {
  return _hasOwnProperty.call(object, name);
}

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function isPrototypeOf(object: Object, other: Object) {
  return _isPrototypeOf.call(object, other);
}

const _isPrototypeOf = Object.prototype.isPrototypeOf;

export function propertyIsEnumerable(object: Object, name: string | number | symbol) {
  return _propertyIsEnumerable.call(object, name);
}

const _propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

export function getPropertyDescriptor(object: Object, name: string | number | symbol) {
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

  return undefined;
}

export function getInheritedPropertyDescriptor(object: Object, name: string | number | symbol) {
  const prototype = Object.getPrototypeOf(object);
  return getPropertyDescriptor(prototype, name);
}

export function assertIsObjectLike(value: any) {
  if (!isObjectLike(value)) {
    throw new Error(`Expected an object-like, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsPlainObject(value: any) {
  if (!isPlainObject(value)) {
    throw new Error(`Expected a plain object, but received a value of type '${getTypeOf(value)}'`);
  }
}

export type ClassLike = Function & {prototype: Object};

export function isClass(value: any): value is ClassLike {
  return typeof value === 'function' && hasOwnProperty(value, 'prototype');
}

export function isES2015Class(value: any): value is Class {
  return (
    typeof value === 'function' &&
    hasOwnProperty(value, 'prototype') &&
    value.toString().startsWith('class ') === true
  );
}

export type InstanceLike = {constructor: ClassLike};

export function isInstance(value: any): value is InstanceLike {
  return isObjectLike(value) && isClass(value.constructor);
}

export type Instance = {constructor: Class};

export function isES2015Instance(value: any): value is Instance {
  return isObjectLike(value) && isES2015Class(value.constructor);
}

export function ensureClass(value: any): ClassLike {
  if (isClass(value)) {
    return value;
  }

  if (isInstance(value)) {
    return value.constructor;
  }

  throw new Error(
    `Expected a class or an instance, but received a value of type '${getTypeOf(value)}'`
  );
}

export function ensureInstance(value: any): InstanceLike {
  if (isInstance(value)) {
    return value;
  }

  if (isClass(value)) {
    return value.prototype;
  }

  throw new Error(
    `Expected a class or an instance, but received a value of type '${getTypeOf(value)}'`
  );
}

export function assertIsClass(value: any) {
  if (!isClass(value)) {
    throw new Error(`Expected a class, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsES2015Class(value: any) {
  if (!isES2015Class(value)) {
    throw new Error(`Expected an ES2015 class, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsInstance(value: any) {
  if (!isInstance(value)) {
    throw new Error(`Expected an instance, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsES2015Instance(value: any) {
  if (!isES2015Instance(value)) {
    throw new Error(
      `Expected an instance of an ES2015 class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export const breakSymbol = Symbol('break');

export function forEachDeep(
  value: any,
  iteratee: (
    value: any,
    nameOrIndex?: string | number,
    objectOrArray?: {[key: string]: any} | Array<any>
  ) => symbol | void,
  {_nameOrIndex, _objectOrArray}: any = {}
): symbol | void {
  const isObject = isPlainObject(value);
  const isArray = Array.isArray(value);

  if (!(isObject || isArray)) {
    return iteratee(value, _nameOrIndex, _objectOrArray);
  }

  if (isObject) {
    const object = value;

    for (const [name, value] of Object.entries(object)) {
      const result = forEachDeep(value, iteratee, {_nameOrIndex: name, _objectOrArray: object});

      if (result === breakSymbol) {
        return breakSymbol;
      }
    }
  }

  if (isArray) {
    const array = value;

    for (const [index, value] of array.entries()) {
      const result = forEachDeep(value, iteratee, {_nameOrIndex: index, _objectOrArray: array});

      if (result === breakSymbol) {
        return breakSymbol;
      }
    }
  }

  return undefined;
}

export function someDeep(value: any, predicate: (value: any) => boolean): boolean {
  const result = forEachDeep(value, function (value) {
    return predicate(value) ? breakSymbol : undefined;
  });

  return result === breakSymbol;
}

export function deleteUndefinedProperties(value: any) {
  forEachDeep(value, function (value, nameOrIndex, objectOrArray) {
    if (
      value === undefined &&
      nameOrIndex !== undefined &&
      objectOrArray !== undefined &&
      !Array.isArray(objectOrArray)
    ) {
      delete objectOrArray[nameOrIndex];
    }
  });

  return value;
}
