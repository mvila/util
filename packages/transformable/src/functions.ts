import {Class} from 'type-fest';

import {getTransformation} from './storage';

export function plainToInstance<TargetClass extends Class<Object>>(
  sourcePlain: Object,
  targetClass: TargetClass,
  sourceContext?: string
) {
  const targetInstance: Record<string, any> = new targetClass();
  const targetPrototype = targetClass.prototype;

  for (let [attributeName, attributeValue] of Object.entries(sourcePlain)) {
    if (attributeValue === undefined) {
      continue;
    }

    if (attributeValue !== null) {
      const transformer = getTransformation(targetPrototype, attributeName)?.input;

      if (transformer) {
        attributeValue = transformer(attributeValue, {source: sourceContext});
      }
    }

    targetInstance[attributeName] = attributeValue;
  }

  return targetInstance as InstanceType<TargetClass>;
}

export function instanceToPlain(sourceInstance: Object, targetContext?: string) {
  const targetPlain: Record<string, any> = {};
  const sourcePrototype = Object.getPrototypeOf(sourceInstance);

  for (let [attributeName, attributeValue] of Object.entries(sourceInstance)) {
    if (attributeValue === undefined) {
      continue;
    }

    if (attributeValue !== null) {
      const transformer = getTransformation(sourcePrototype, attributeName)?.output;

      if (transformer) {
        attributeValue = transformer(attributeValue, {target: targetContext});
      }

      if (attributeValue === undefined) {
        continue;
      }
    }

    targetPlain[attributeName] = attributeValue;
  }

  return targetPlain;
}
