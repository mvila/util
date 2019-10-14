import {possiblyAsync} from '../../..';

describe('possibly-async', () => {
  test('possiblyAsync()', async () => {
    const syncFunc = () => 'a';
    let result = possiblyAsync(syncFunc(), result => result + 'b');
    expect(result).toBe('ab');

    const asyncFunc = () => new Promise(resolve => setTimeout(() => resolve('a'), 5));
    result = await possiblyAsync(asyncFunc(), result => result + 'b');
    expect(result).toBe('ab');

    const asyncFunc2 = () => possiblyAsync(asyncFunc(), result => result + 'b');
    result = await possiblyAsync(asyncFunc2(), result => result + 'c');
    expect(result).toBe('abc');

    const asyncFunc3 = () =>
      possiblyAsync(
        asyncFunc2(),
        result => new Promise(resolve => setTimeout(() => resolve(result + 'c'), 5))
      );
    result = await possiblyAsync(asyncFunc3(), result => result + 'd');
    expect(result).toBe('abcd');
  });

  test('possiblyAsync.forEach()', async () => {
    let results = [];
    possiblyAsync.forEach([1, 2, 3], value => {
      results.push(value * 2);
    });
    expect(results).toEqual([2, 4, 6]);

    results = [];
    await possiblyAsync.forEach([1, 2, 3], value => {
      if (value === 2) {
        return makePromise(() => {
          results.push(value * 2);
        });
      }
      results.push(value * 2);
    });
    expect(results).toEqual([2, 4, 6]);
  });

  test('possiblyAsync.map()', async () => {
    let results = possiblyAsync.map([1, 2, 3], value => value * 2);
    expect(results).toEqual([2, 4, 6]);

    results = await possiblyAsync.map([1, 2, 3], value => {
      if (value === 2) {
        return makePromise(value * 2);
      }
      return value * 2;
    });
    expect(results).toEqual([2, 4, 6]);
  });

  test('possiblyAsync.reduce()', async () => {
    let results = possiblyAsync.reduce(
      [1, 2, 3],
      (accumulator, currentValue) => [...accumulator, currentValue * 2],
      []
    );
    expect(results).toEqual([2, 4, 6]);

    results = await possiblyAsync.reduce(
      [1, 2, 3],
      (accumulator, currentValue) => {
        if (currentValue === 2) {
          return makePromise([...accumulator, currentValue * 2]);
        }
        return [...accumulator, currentValue * 2];
      },
      []
    );
    expect(results).toEqual([2, 4, 6]);
  });

  test('possiblyAsync.mapObject()', async () => {
    let results = possiblyAsync.mapObject({a: 1, b: 2, c: 3}, value => value * 2);
    expect(results).toEqual({a: 2, b: 4, c: 6});

    results = await possiblyAsync.mapObject({a: 1, b: 2, c: 3}, value => {
      if (value === 2) {
        return makePromise(value * 2);
      }
      return value * 2;
    });
    expect(results).toEqual({a: 2, b: 4, c: 6});
  });

  test('possiblyAsync.all()', async () => {
    let results = possiblyAsync.all([1, 2, 3]);
    expect(results).toEqual([1, 2, 3]);

    results = await possiblyAsync.all([1, makePromise(2), 3]);
    expect(results).toEqual([1, 2, 3]);
  });

  test('possiblyAsync.possiblyMany()', async () => {
    let results = possiblyAsync.possiblyMany(1);
    expect(results).toBe(1);

    results = possiblyAsync.possiblyMany([1, 2, 3]);
    expect(results).toEqual([1, 2, 3]);

    results = await possiblyAsync.possiblyMany(makePromise(1));
    expect(results).toEqual(1);

    results = await possiblyAsync.possiblyMany([1, makePromise(2), 3]);
    expect(results).toEqual([1, 2, 3]);
  });
});

function makePromise(value) {
  return new Promise(resolve => {
    setTimeout(() => {
      while (typeof value === 'function') {
        value = value();
      }
      resolve(value);
    }, 5);
  });
}
