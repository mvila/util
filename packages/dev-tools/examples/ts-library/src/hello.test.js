import {hello} from './hello';

describe('hello (JS)', () => {
  test('hello()', () => {
    expect(hello()).toBe('Hello, World!');

    expect(hello('universe')).toBe('Hello, Universe!');
  });

  test('@decorate', () => {
    function decorate(_target, _name, descriptor) {
      expect(typeof descriptor).toBe('object');
    }

    class Test {
      @decorate static attribute;
    }
  });
});
