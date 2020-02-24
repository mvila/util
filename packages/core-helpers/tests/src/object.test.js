import {forEachDeep, someDeep, breakSymbol} from '../../..';

describe('Object', () => {
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
