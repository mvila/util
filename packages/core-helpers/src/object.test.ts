import {forEachDeep, someDeep, deleteUndefinedProperties, breakSymbol} from './object';

describe('Object', () => {
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
