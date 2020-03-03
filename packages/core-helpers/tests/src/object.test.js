import {
  getTypeOf,
  isClass,
  isES2015Class,
  isInstance,
  getClassOf,
  getInstanceOf,
  forEachDeep,
  someDeep,
  breakSymbol
} from '../../..';

describe('Object', () => {
  test('getTypeOf()', async () => {
    expect(getTypeOf(undefined)).toBe('undefined');
    expect(getTypeOf(null)).toBe('null');
    expect(getTypeOf(true)).toBe('boolean');
    expect(getTypeOf(123)).toBe('number');
    expect(getTypeOf('abc')).toBe('string');
    expect(getTypeOf([1, 2, 3])).toBe('array');
    expect(getTypeOf({})).toBe('object');
    expect(getTypeOf(() => {})).toBe('function');
    expect(getTypeOf(function() {})).toBe('function');
    expect(getTypeOf(new Date())).toBe('date');
    expect(getTypeOf(/abc/)).toBe('regExp');
    expect(getTypeOf(new Error())).toBe('error');

    class Movie {}

    const movie = new Movie();

    expect(getTypeOf(Movie)).toBe('Movie');
    expect(getTypeOf(movie)).toBe('movie');

    Movie.displayName = 'Film';

    expect(getTypeOf(Movie)).toBe('Film');
    expect(getTypeOf(movie)).toBe('film');
  });

  test('isClass()', async () => {
    expect(isClass(undefined)).toBe(false);
    expect(isClass(null)).toBe(false);
    expect(isClass('abc')).toBe(false);
    expect(isClass({})).toBe(false);
    expect(isClass([])).toBe(false);
    expect(isClass(() => {})).toBe(false);

    expect(isClass(function() {})).toBe(true);

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

    expect(isES2015Class(function() {})).toBe(false);

    class Movie {}

    const movie = new Movie();

    expect(isES2015Class(Movie)).toBe(true);
    expect(isES2015Class(movie)).toBe(false);
  });

  test('isInstance()', async () => {
    expect(isInstance(undefined)).toBe(true);
    expect(isInstance(null)).toBe(true);
    expect(isInstance('abc')).toBe(true);
    expect(isInstance({})).toBe(true);
    expect(isInstance([])).toBe(true);
    expect(isInstance(() => {})).toBe(true);

    expect(isInstance(function() {})).toBe(false);

    class Movie {}

    const movie = new Movie();

    expect(isInstance(Movie)).toBe(false);
    expect(isInstance(movie)).toBe(true);
  });

  test('getClassOf()', async () => {
    expect(getClassOf(undefined)).toBe(undefined);
    expect(getClassOf(null)).toBe(undefined);
    expect(getClassOf({})).toBe(Object);
    expect(getClassOf([])).toBe(Array);
    expect(getClassOf('abc')).toBe(String);

    class Movie {}

    const movie = new Movie();

    expect(getClassOf(Movie)).toBe(Movie);
    expect(getClassOf(movie)).toBe(Movie);
  });

  test('getInstanceOf()', async () => {
    const object = {};
    const array = [];

    expect(getInstanceOf(undefined)).toBe(undefined);
    expect(getInstanceOf(null)).toBe(null);
    expect(getInstanceOf(object)).toBe(object);
    expect(getInstanceOf(array)).toBe(array);
    expect(getInstanceOf('abc')).toBe('abc');

    class Movie {}

    const movie = new Movie();

    expect(getInstanceOf(Movie)).toBe(Movie.prototype);
    expect(getInstanceOf(Movie.prototype)).toBe(Movie.prototype);
    expect(getInstanceOf(movie)).toBe(movie);
  });

  test('forEachDeep', async () => {
    const date = new Date();
    const func = function() {};

    class Class {}

    const instance = new Class();
    instance.attribute = 'zzz';

    let eachValues = [];
    let iteratee = value => {
      eachValues.push(value);
    };
    let value;
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([undefined]);

    value = null;
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([null]);

    value = 'aaa';
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual(['aaa']);

    value = date;
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([date]);

    value = func;
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([func]);

    value = instance;
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([instance]);

    value = {
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
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual([
      'aaa',
      'bbb',
      'ccc',
      func,
      'ddd',
      'eee',
      instance,
      111,
      date,
      222,
      instance,
      func,
      instance
    ]);

    iteratee = value => {
      if (value === instance) {
        return breakSymbol;
      }
      eachValues.push(value);
    };
    eachValues = [];
    forEachDeep(value, iteratee);

    expect(eachValues).toEqual(['aaa', 'bbb', 'ccc', func, 'ddd', 'eee']);
  });

  test('someDeep', async () => {
    const date = new Date();
    const func = function() {};

    class Class {}

    const instance = new Class();
    instance.attribute = 'zzz';

    const predicate = jest.fn(value => value === instance);
    let value = {
      string: 'aaa',
      array: ['bbb', 'ccc', func, ['ddd'], {string: 'eee'}]
    };

    expect(someDeep(value, predicate)).toBe(false);
    expect(predicate).toHaveBeenCalledTimes(6);

    predicate.mockClear();
    value = {
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

    expect(someDeep(value, predicate)).toBe(true);
    expect(predicate).toHaveBeenCalledTimes(7);
  });
});
