import type {AttributeTransformationMap, Transformation} from './types';

export function getTransformation(prototype: Object, attributeName: string) {
  const prototypeMap = getPrototypeMap();

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
  const prototypeMap = getPrototypeMap();

  let attributeTransformationMap = prototypeMap.get(prototype);

  if (!attributeTransformationMap) {
    attributeTransformationMap = new Map();
    prototypeMap.set(prototype, attributeTransformationMap);
  }

  attributeTransformationMap.set(attributeName, transformation);
}

declare global {
  var __transformablePrototypeMap: WeakMap<Object, AttributeTransformationMap>;
}

function getPrototypeMap() {
  let prototypeMap = globalThis.__transformablePrototypeMap;

  if (prototypeMap === undefined) {
    prototypeMap = new WeakMap<Object, AttributeTransformationMap>();
    globalThis.__transformablePrototypeMap = prototypeMap;
  }

  return prototypeMap;
}
