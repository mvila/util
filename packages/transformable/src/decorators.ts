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

export function TransformInstance(
  classProvider: () => Class<Object>,
  {excludeOutput = false}: {excludeOutput?: boolean} = {}
) {
  return Transform({
    input: (sourcePlain: Object, {source}) => plainToInstance(sourcePlain, classProvider(), source),
    output: (sourceInstance: Object, {target}) =>
      !excludeOutput ? instanceToPlain(sourceInstance, target) : undefined
  });
}

export function TransformInstances(
  classProvider: () => Class<Object>,
  {excludeOutput = false}: {excludeOutput?: boolean} = {}
) {
  return Transform({
    input: (sourcePlains: Object[], {source}) =>
      sourcePlains.map((sourcePlain) => plainToInstance(sourcePlain, classProvider(), source)),
    output: (sourceInstances: Object[], {target}) =>
      !excludeOutput
        ? sourceInstances.map((sourceInstance) => instanceToPlain(sourceInstance, target))
        : undefined
  });
}

export function ExcludeOutput() {
  return Transform({
    output: (_sourceValue: unknown) => undefined
  });
}
