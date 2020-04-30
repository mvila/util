import {
  isClass,
  isES2015Class,
  isInstance,
  ensureClass,
  ensureInstance,
  forEachDeep,
  someDeep,
  deleteUndefinedProperties,
  breakSymbol
} from './object';

describe('Object', () => {
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
      "Expected a class or an instance, but received a value of type 'null'"
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
      "Expected a class or an instance, but received a value of type 'null'"
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

  test('forEachDeep', async () => {
    const runForEachDeep = function (value: any) {
      const results: any[] = [];

      const iteratee = (value: any, nameOrIndex?: string | number, objectOrArray?: any) => {
        results.push({value, nameOrIndex, objectOrArray});
      };

      forEachDeep(value, iteratee);

      return results;
    };

    const date = new Date();
    const func = function () {};

    class Class {
      attribute?: string;
    }

    const instance = new Class();
    instance.attribute = 'zzz';

    expect(runForEachDeep(undefined)).toEqual([{value: undefined}]);

    expect(runForEachDeep(null)).toEqual([{value: null}]);

    expect(runForEachDeep('aaa')).toEqual([{value: 'aaa'}]);

    expect(runForEachDeep(date)).toEqual([{value: date}]);

    expect(runForEachDeep(func)).toEqual([{value: func}]);

    expect(runForEachDeep(instance)).toEqual([{value: instance}]);

    const value = {
      string: 'aaa',
      array: ['bbb', 'ccc', func, ['ddd'], {string: 'eee', instance}],
      object: {
        number: 111,
        date,
        array: [222, instance]
      },
      func,
      instance
    };

    expect(runForEachDeep(value)).toEqual([
      {value: 'aaa', nameOrIndex: 'string', objectOrArray: value},
      {value: 'bbb', nameOrIndex: 0, objectOrArray: value.array},
      {value: 'ccc', nameOrIndex: 1, objectOrArray: value.array},
      {value: func, nameOrIndex: 2, objectOrArray: value.array},
      {value: 'ddd', nameOrIndex: 0, objectOrArray: value.array[3]},
      {value: 'eee', nameOrIndex: 'string', objectOrArray: value.array[4]},
      {value: instance, nameOrIndex: 'instance', objectOrArray: value.array[4]},
      {value: 111, nameOrIndex: 'number', objectOrArray: value.object},
      {value: date, nameOrIndex: 'date', objectOrArray: value.object},
      {value: 222, nameOrIndex: 0, objectOrArray: value.object.array},
      {value: instance, nameOrIndex: 1, objectOrArray: value.object.array},
      {value: func, nameOrIndex: 'func', objectOrArray: value},
      {value: instance, nameOrIndex: 'instance', objectOrArray: value}
    ]);

    const results: any[] = [];
    const iteratee = (value: any): symbol | void => {
      if (value === instance) {
        return breakSymbol;
      }
      results.push(value);
    };
    forEachDeep(value, iteratee);

    expect(results).toEqual(['aaa', 'bbb', 'ccc', func, 'ddd', 'eee']);
  });

  test('someDeep', async () => {
    const date = new Date();
    const func = function () {};

    class Class {
      attribute?: string;
    }

    const instance = new Class();
    instance.attribute = 'zzz';

    const predicate = jest.fn((value) => value === instance);
    let value: any = {
      string: 'aaa',
      array: ['bbb', 'ccc', func, ['ddd'], {string: 'eee'}]
    };

    expect(someDeep(value, predicate)).toBe(false);
    expect(predicate).toHaveBeenCalledTimes(6);

    predicate.mockClear();
    value = {
      string: 'aaa',
      array: ['bbb', 'ccc', func, ['ddd'], {string: 'eee'}, instance],
      object: {
        number: 111,
        date,
        array: [222, instance]
      },
      func,
      instance
    };

    expect(someDeep(value, predicate)).toBe(true);
    expect(predicate).toHaveBeenCalledTimes(7);
  });

  test('deleteUndefinedProperties()', async () => {
    expect(deleteUndefinedProperties(undefined)).toBeUndefined();
    expect(deleteUndefinedProperties(null)).toBe(null);
    expect(deleteUndefinedProperties(111)).toBe(111);
    expect(deleteUndefinedProperties('aaa')).toBe('aaa');

    expect(deleteUndefinedProperties({x: 1, y: undefined})).toStrictEqual({x: 1});
    expect(deleteUndefinedProperties({x: 1, y: {z: undefined}})).toStrictEqual({x: 1, y: {}});

    expect(
      deleteUndefinedProperties([
        {x: 1, y: 2},
        {x: 1, y: undefined}
      ])
    ).toStrictEqual([{x: 1, y: 2}, {x: 1}]);

    // Undefined array items should not be deleted
    expect(deleteUndefinedProperties([1, undefined, null, 2])).toStrictEqual([
      1,
      undefined,
      null,
      2
    ]);
  });
});
