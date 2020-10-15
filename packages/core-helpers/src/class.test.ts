import {isClass, isES2015Class, isInstance, ensureClass, ensureInstance} from './class';

describe('Class', () => {
  test('isClass()', async () => {
    expect(isClass(undefined)).toBe(false);
    expect(isClass(null)).toBe(false);
    expect(isClass('abc')).toBe(false);
    expect(isClass({})).toBe(false);
    expect(isClass([])).toBe(false);
    expect(isClass(() => {})).toBe(false);

    expect(isClass(function () {})).toBe(true);

    class Movie {}

    const movie = new Movie();

    expect(isClass(Movie)).toBe(true);
    expect(isClass(movie)).toBe(false);
  });

  test('isES2015Class()', async () => {
    expect(isES2015Class(undefined)).toBe(false);
    expect(isES2015Class(null)).toBe(false);
    expect(isES2015Class('abc')).toBe(false);
    expect(isES2015Class({})).toBe(false);
    expect(isES2015Class([])).toBe(false);
    expect(isES2015Class(() => {})).toBe(false);

    expect(isES2015Class(function () {})).toBe(false);

    class Movie {}

    const movie = new Movie();

    expect(isES2015Class(Movie)).toBe(true);
    expect(isES2015Class(movie)).toBe(false);
  });

  test('isInstance()', async () => {
    expect(isInstance(undefined)).toBe(false);
    expect(isInstance(null)).toBe(false);
    expect(isInstance('abc')).toBe(false);
    expect(isInstance({})).toBe(true);
    expect(isInstance([])).toBe(true);
    expect(isInstance(() => {})).toBe(false);
    expect(isInstance(function () {})).toBe(false);

    class Movie {}

    const movie = new Movie();

    expect(isInstance(Movie)).toBe(false);
    expect(isInstance(movie)).toBe(true);
  });

  test('ensureClass()', async () => {
    expect(() => ensureClass(undefined)).toThrow(
      "Expected a class or an instance, but received a value of type 'undefined'"
    );
    expect(() => ensureClass(null)).toThrow(
      "Expected a class or an instance, but received a value of type 'object'"
    );
    expect(() => ensureClass('abc')).toThrow(
      "Expected a class or an instance, but received a value of type 'string'"
    );
    expect(ensureClass({})).toBe(Object);
    expect(ensureClass([])).toBe(Array);

    class Movie {}

    const movie = new Movie();

    expect(ensureClass(Movie)).toBe(Movie);
    expect(ensureClass(movie)).toBe(Movie);
  });

  test('ensureInstance()', async () => {
    const object = {};
    const array: any[] = [];

    expect(() => ensureInstance(undefined)).toThrow(
      "Expected a class or an instance, but received a value of type 'undefined'"
    );
    expect(() => ensureInstance(null)).toThrow(
      "Expected a class or an instance, but received a value of type 'object'"
    );
    expect(() => ensureInstance('abc')).toThrow(
      "Expected a class or an instance, but received a value of type 'string'"
    );
    expect(ensureInstance(object)).toBe(object);
    expect(ensureInstance(array)).toBe(array);

    class Movie {}

    const movie = new Movie();

    expect(ensureInstance(Movie)).toBe(Movie.prototype);
    expect(ensureInstance(Movie.prototype)).toBe(Movie.prototype);
    expect(ensureInstance(movie)).toBe(movie);
  });
});
