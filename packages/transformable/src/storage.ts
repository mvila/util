import type {AttributeTransformationMap, Transformation} from './types';

const prototypeMap = new WeakMap<Object, AttributeTransformationMap>();

export function getTransformation(prototype: Object, attributeName: string) {
  while (true) {
    const transformation = prototypeMap.get(prototype)?.get(attributeName);

    if (transformation) {
      return transformation;
    }

    const parentPrototype = Object.getPrototypeOf(prototype);

    if (!parentPrototype) {
      return undefined;
    }

    prototype = parentPrototype;
  }
}

export function setTransformation(
  prototype: Object,
  attributeName: string,
  transformation: Transformation
) {
  let attributeTransformationMap = prototypeMap.get(prototype);

  if (!attributeTransformationMap) {
    attributeTransformationMap = new Map();
    prototypeMap.set(prototype, attributeTransformationMap);
  }

  attributeTransformationMap.set(attributeName, transformation);
}
