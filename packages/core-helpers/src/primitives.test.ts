import {assertIsBoolean, assertIsNumber, assertIsString} from './primitives';

describe('Utilities', () => {
  test('assertIsBoolean()', async () => {
    expect(() => assertIsBoolean(false)).not.toThrow();
    expect(() => assertIsBoolean(true)).not.toThrow();

    // @ts-expect-error
    expect(() => assertIsBoolean(undefined)).toThrow(
      "Expected a boolean, but received a value of type 'undefined'"
    );
    // @ts-expect-error
    expect(() => assertIsBoolean('abc')).toThrow(
      "Expected a boolean, but received a value of type 'string'"
    );
  });

  test('assertIsNumber()', async () => {
    expect(() => assertIsNumber(0)).not.toThrow();
    expect(() => assertIsNumber(123.45)).not.toThrow();

    // @ts-expect-error
    expect(() => assertIsNumber(undefined)).toThrow(
      "Expected a number, but received a value of type 'undefined'"
    );
    // @ts-expect-error
    expect(() => assertIsNumber('abc')).toThrow(
      "Expected a number, but received a value of type 'string'"
    );
  });

  test('assertIsString()', async () => {
    expect(() => assertIsString('')).not.toThrow();
    expect(() => assertIsString('abc')).not.toThrow();

    // @ts-expect-error
    expect(() => assertIsString(undefined)).toThrow(
      "Expected a string, but received a value of type 'undefined'"
    );
    // @ts-expect-error
    expect(() => assertIsString(123.45)).toThrow(
      "Expected a string, but received a value of type 'number'"
    );
  });
});
