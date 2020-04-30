import {getTypeOf} from './utilities';

export function assertIsBoolean(value: boolean) {
  if (typeof value !== 'boolean') {
    throw new Error(`Expected a boolean, but received a value of type '${getTypeOf(value)}'`);
  }
}

export function assertIsNumber(value: number) {
  if (typeof value !== 'number') {
    throw new Error(`Expected a number, but received a value of type '${getTypeOf(value)}'`);
  }
}
export function assertIsString(value: string) {
  if (typeof value !== 'string') {
    throw new Error(`Expected a string, but received a value of type '${getTypeOf(value)}'`);
  }
}
