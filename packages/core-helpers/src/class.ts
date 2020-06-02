import {Class} from 'type-fest';

import {hasOwnProperty, isObjectLike} from './object';
import {getTypeOf} from './utilities';

// Helps to implement the "modern" mixin pattern
// https://mariusschulz.com/blog/mixin-classes-in-typescript
// https://www.bryntum.com/blog/the-mixin-pattern-in-typescript-all-you-need-to-know-part-2/
export type Constructor<Class extends BaseConstructor = BaseConstructor> = BaseConstructor<
  InstanceType<Class>
> &
  SuppressNew<Class>;

type BaseConstructor<Instance = {}> = new (...args: any[]) => Instance;

type SuppressNew<T> = {[K in keyof T]: T[K]};

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

export function assertIsClass(value: any): asserts value is ClassLike {
  if (!isClass(value)) {
    throw new Error(`Expected a class, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsES2015Class(value: any): asserts value is Class {
  if (!isES2015Class(value)) {
    throw new Error(`Expected an ES2015 class, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsInstance(value: any): asserts value is InstanceLike {
  if (!isInstance(value)) {
    throw new Error(`Expected an instance, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsES2015Instance(value: any): asserts value is Instance {
  if (!isES2015Instance(value)) {
    throw new Error(
      `Expected an instance of an ES2015 class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}
