import isPlainObject from 'lodash/isPlainObject';
import lowerFirst from 'lodash/lowerFirst';

export function hasOwnProperty(object: Object, name: string | number | symbol): boolean {
  return _hasOwnProperty.call(object, name);
}

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function isPrototypeOf(object: Object, other: Object): boolean {
  return _isPrototypeOf.call(object, other);
}

const _isPrototypeOf = Object.prototype.isPrototypeOf;

export function propertyIsEnumerable(object: Object, name: string | number | symbol): boolean {
  return _propertyIsEnumerable.call(object, name);
}

const _propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

export function getPropertyDescriptor(
  object: Object,
  name: string | number | symbol
): PropertyDescriptor | undefined {
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

export function getInheritedPropertyDescriptor(
  object: Object,
  name: string | number | symbol
): PropertyDescriptor | undefined {
  const prototype = Object.getPrototypeOf(object);
  return getPropertyDescriptor(prototype, name);
}

export function getFunctionName(
  func: Function & {displayName?: string; humanName?: string},
  {humanize = false} = {}
): string {
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

export function getTypeOf(value: any, {humanize = false} = {}): string {
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

export function getHumanTypeOf(value: any): string {
  return getTypeOf(value, {humanize: true});
}

export function isClass(value: any): boolean {
  return typeof value === 'function' && hasOwnProperty(value, 'prototype');
}

export function isES2015Class(value: any): boolean {
  return typeof value === 'function' && value.toString().startsWith('class');
}

export function isInstance(value: any): boolean {
  return !isClass(value);
}

export function getClassOf(value: any): Function | undefined {
  if (isClass(value)) {
    return value;
  }

  return value?.constructor;
}

export function getInstanceOf(value: any): Object {
  if (isInstance(value)) {
    return value;
  }

  return value.prototype;
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
