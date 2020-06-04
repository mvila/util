import {hello} from './hello';

describe('hello (TS)', () => {
  test('hello()', () => {
    expect(hello()).toBe('Hello, World!');

    expect(hello('universe')).toBe('Hello, Universe!');
  });
});
