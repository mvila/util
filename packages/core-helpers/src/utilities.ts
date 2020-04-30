import {isES2015Class} from './object';
import {getFunctionName} from './function';

export function getTypeOf(value: any) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object' && typeof value.constructor === 'function') {
    return getFunctionName(value.constructor) || 'Object';
  }

  if (isES2015Class(value)) {
    return `typeof ${getFunctionName(value) || 'Object'}`;
  }

  if (typeof value === 'function') {
    return 'Function';
  }

  return typeof value;
}
