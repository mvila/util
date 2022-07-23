import {Class} from 'type-fest';

import {plainToInstance, instanceToPlain} from './functions';
import {setTransformation} from './storage';
import type {Transformation} from './types';

export function Transform(transformation: Transformation) {
  return function (targetPrototype: Object, attributeName: string) {
    setTransformation(targetPrototype, attributeName, transformation);
  };
}

export function TransformDate() {
  return Transform({
    input: (sourceDate: string | Date) => new Date(sourceDate)
  });
}

export function TransformSet() {
  return Transform({
    input: (sourceArray: Array<unknown> | Set<unknown>) => new Set(sourceArray),
    output: (sourceSet: Set<String>) => Array.from(sourceSet)
  });
}

export function TransformInstance(classProvider: () => Class<Object>) {
  return Transform({
    input: (sourcePlain: Object) => plainToInstance(sourcePlain, classProvider()),
    output: (sourceInstance: Object) => instanceToPlain(sourceInstance)
  });
}

export function TransformInstances(classProvider: () => Class<Object>) {
  return Transform({
    input: (sourcePlains: Object[]) =>
      sourcePlains.map((sourcePlain) => plainToInstance(sourcePlain, classProvider())),
    output: (sourceInstances: Object[]) =>
      sourceInstances.map((sourceInstance) => instanceToPlain(sourceInstance))
  });
}

export function ExcludeOutput() {
  return Transform({
    output: (_sourceValue: unknown) => undefined
  });
}
