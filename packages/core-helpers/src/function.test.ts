import {getFunctionName, assertIsFunction} from './function';

describe('Function', () => {
  test('getFunctionName()', async () => {
    expect(getFunctionName(() => {})).toBe('');
    expect(getFunctionName(function () {})).toBe('');

    const func = function () {};

    expect(getFunctionName(func)).toBe('func');

    func.displayName = 'function';

    expect(getFunctionName(func)).toBe('function');

    // @ts-ignore
    expect(() => getFunctionName(undefined)).toThrow(
      "Expected a function, but received a value of type 'undefined'"
    );
    // @ts-ignore
    expect(() => getFunctionName('abc')).toThrow(
      "Expected a function, but received a value of type 'string'"
    );
  });

  test('assertIsFunction()', async () => {
    expect(() => assertIsFunction(() => {})).not.toThrow();
    expect(() => assertIsFunction(function () {})).not.toThrow();

    // @ts-ignore
    expect(() => assertIsFunction(undefined)).toThrow(
      "Expected a function, but received a value of type 'undefined'"
    );
    // @ts-ignore
    expect(() => assertIsFunction('abc')).toThrow(
      "Expected a function, but received a value of type 'string'"
    );
  });
});
