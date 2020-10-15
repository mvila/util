import lodashIsPlainObject from 'lodash/isPlainObject';
import lodashIsObjectLike from 'lodash/isObjectLike';

export type PropertyKey = string | number | symbol;

export function hasOwnProperty(object: Object, key: PropertyKey) {
  return _hasOwnProperty.call(object, key);
}

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function isPrototypeOf(object: Object, other: Object) {
  return _isPrototypeOf.call(object, other);
}

const _isPrototypeOf = Object.prototype.isPrototypeOf;

export function propertyIsEnumerable(object: Object, key: PropertyKey) {
  return _propertyIsEnumerable.call(object, key);
}

const _propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

export function getPropertyDescriptor(object: Object, key: PropertyKey) {
  if (!((typeof object === 'object' && object !== null) || typeof object === 'function')) {
    return undefined;
  }

  if (!(key in object)) {
    return undefined;
  }

  while (object !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor) {
      return descriptor;
    }
    object = Object.getPrototypeOf(object);
  }

  return undefined;
}

export function getInheritedPropertyDescriptor(object: Object, key: PropertyKey) {
  const prototype = Object.getPrototypeOf(object);
  return getPropertyDescriptor(prototype, key);
}

export type ObjectLike = {[key: string]: any};

export function isObjectLike(value: any): value is ObjectLike {
  return lodashIsObjectLike(value);
}

export type PlainObject = {[key: string]: any};

export function isPlainObject(value: any): value is PlainObject {
  return lodashIsPlainObject(value);
}

export function assertIsObjectLike(value: any): asserts value is ObjectLike {
  if (!isObjectLike(value)) {
    throw new Error(`Expected an object-like, but received a value of type '${typeof value}'`);
  }
}

export function assertIsPlainObject(value: any): asserts value is PlainObject {
  if (!isPlainObject(value)) {
    throw new Error(`Expected a plain object, but received a value of type '${typeof value}'`);
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
