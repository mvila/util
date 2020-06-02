import {getTypeOf} from './utilities';

export type SyncFunction<Args extends any[] = any[], Result = any> = (...args: Args) => Result;
export type AsyncFunction<Args extends any[] = any[], Result = any> = (
  ...args: Args
) => Promise<Result>;

export function getFunctionName(
  func: Function & {
    displayName?: string;
  }
) {
  assertIsFunction(func);

  let name = func.displayName;

  if (name !== undefined) {
    return name;
  }

  name = func.name;

  if (name !== undefined) {
    return name;
  }

  // Source: https://github.com/sindresorhus/fn-name
  name = (/function ([^(]+)?\(/.exec(func.toString()) || [])[1];

  if (name !== undefined) {
    return name;
  }

  return '';
}

export function assertIsFunction(value: Function): asserts value is Function {
  if (typeof value !== 'function') {
    throw new Error(`Expected a function, but received a value of type '${getTypeOf(value)}'`);
  }
}
