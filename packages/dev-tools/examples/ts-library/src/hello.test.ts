import {hello} from './hello';

describe('hello', () => {
  test('hello()', () => {
    expect(hello()).toBe('Hello, World!');

    expect(hello('universe')).toBe('Hello, Universe!');
  });
});
