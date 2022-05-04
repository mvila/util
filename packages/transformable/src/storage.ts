import type {AttributeTransformationMap, Transformation} from './types';

const prototypeMap = new WeakMap<Object, AttributeTransformationMap>();

export function getTransformation(prototype: Object, attributeName: string) {
  return prototypeMap.get(prototype)?.get(attributeName);
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
