import {possiblyAsync} from '../../..';

describe('possibly-async', () => {
  test('possiblyAsync() with one then callback', async () => {
    const syncFunc = () => 'a';
    let result = possiblyAsync(syncFunc(), {then: result => result + 'b'});
    expect(result).toBe('ab');

    const asyncFunc = () => new Promise(resolve => setTimeout(() => resolve('a'), 5));
    result = await possiblyAsync(asyncFunc(), {then: result => result + 'b'});
    expect(result).toBe('ab');

    const asyncFunc2 = () => possiblyAsync(asyncFunc(), {then: result => result + 'b'});
    result = await possiblyAsync(asyncFunc2(), {then: result => result + 'c'});
    expect(result).toBe('abc');

    const asyncFunc3 = () =>
      possiblyAsync(asyncFunc2(), {
        then: result => new Promise(resolve => setTimeout(() => resolve(result + 'c'), 5))
      });
    result = await possiblyAsync(asyncFunc3(), {then: result => result + 'd'});
    expect(result).toBe('abcd');
  });

  test('possiblyAsync() with multiple then callbacks', async () => {
    const asyncFunc1 = () => new Promise(resolve => setTimeout(() => resolve('a'), 5));
    const asyncFunc2 = result => new Promise(resolve => setTimeout(() => resolve(result + 'b'), 5));
    const asyncFunc3 = result => new Promise(resolve => setTimeout(() => resolve(result + 'c'), 5));

    expect(await possiblyAsync(asyncFunc1(), {then: [asyncFunc2, asyncFunc3]})).toBe('abc');
  });

  test('possiblyAsync() with a catch callback', async () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    const catchCallback = jest.fn(error => {
      expect(error).toBe(error1);
      throw error2;
    });

    let result;
    expect(() => {
      result = possiblyAsync('a', {
        then() {
          throw error1;
        },
        catch: catchCallback
      });
    }).toThrow(error2);
    expect(result).toBeUndefined();
    expect(catchCallback).toHaveBeenCalledTimes(1);

    await expect(
      (async () => {
        result = await possiblyAsync(Promise.reject(error1), {catch: catchCallback});
      })()
    ).rejects.toThrow(error2);
    expect(result).toBeUndefined();
    expect(catchCallback).toHaveBeenCalledTimes(2);

    await expect(
      (async () => {
        result = await possiblyAsync('a', {
          async then() {
            throw error1;
          },
          catch: catchCallback
        });
      })()
    ).rejects.toThrow(error2);
    expect(result).toBeUndefined();
    expect(catchCallback).toHaveBeenCalledTimes(3);

    expect(() => {
      result = possiblyAsync('a', {
        then: [
          result => result + 'b',
          () => {
            throw error1;
          }
        ],
        catch: catchCallback
      });
    }).toThrow(error2);
    expect(result).toBeUndefined();
    expect(catchCallback).toHaveBeenCalledTimes(4);
  });

  test('possiblyAsync() with a finally callback', async () => {
    const finallyCallback = jest.fn();

    let result = possiblyAsync('a', {then: result => result + 'b', finally: finallyCallback});
    expect(result).toBe('ab');
    expect(finallyCallback).toHaveBeenCalledTimes(1);

    result = await possiblyAsync(Promise.resolve('a'), {
      then: result => result + 'b',
      finally: finallyCallback
    });
    expect(result).toBe('ab');
    expect(finallyCallback).toHaveBeenCalledTimes(2);

    result = await possiblyAsync(Promise.resolve('a'), {
      then: async result => result + 'b',
      finally: finallyCallback
    });
    expect(result).toBe('ab');
    expect(finallyCallback).toHaveBeenCalledTimes(3);

    result = possiblyAsync('a', {
      then: [result => result + 'b', result => result + 'c'],
      finally: finallyCallback
    });
    expect(result).toBe('abc');
    expect(finallyCallback).toHaveBeenCalledTimes(4);

    const error = new Error('Error');

    result = undefined;
    expect(() => {
      result = possiblyAsync('a', {
        then: [
          result => result + 'b',
          result => result + 'c',
          () => {
            throw error;
          }
        ],
        finally: finallyCallback
      });
    }).toThrow(error);
    expect(result).toBeUndefined();
    expect(finallyCallback).toHaveBeenCalledTimes(5);

    result = undefined;
    await expect(
      (async () => {
        result = await possiblyAsync(Promise.resolve('a'), {
          then: [
            async result => result + 'b',
            result => result + 'c',
            async () => {
              throw error;
            }
          ],
          finally: finallyCallback
        });
      })()
    ).rejects.toThrow(error);
    expect(result).toBeUndefined();
    expect(finallyCallback).toHaveBeenCalledTimes(6);
  });

  test('possiblyAsync() with both a catch and a finally callback', async () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    const catchCallback = jest.fn(error => {
      expect(error).toBe(error1);
      return error2;
    });

    const finallyCallback = jest.fn();

    let result = possiblyAsync('a', {
      then: () => {
        throw error1;
      },
      catch: catchCallback,
      finally: finallyCallback
    });
    expect(result).toBe(error2);
    expect(catchCallback).toHaveBeenCalledTimes(1);
    expect(finallyCallback).toHaveBeenCalledTimes(1);

    result = await possiblyAsync(Promise.reject(error1), {
      catch: catchCallback,
      finally: finallyCallback
    });
    expect(result).toBe(error2);
    expect(catchCallback).toHaveBeenCalledTimes(2);
    expect(finallyCallback).toHaveBeenCalledTimes(2);

    result = await possiblyAsync('a', {
      then: async () => {
        throw error1;
      },
      catch: catchCallback,
      finally: finallyCallback
    });
    expect(result).toBe(error2);
    expect(catchCallback).toHaveBeenCalledTimes(3);
    expect(finallyCallback).toHaveBeenCalledTimes(3);

    const catchCallback2 = jest.fn(error => {
      expect(error).toBe(error1);
      throw error2;
    });
    result = possiblyAsync(Promise.resolve('a'), {
      then: async () => {
        throw error1;
      },
      catch: catchCallback2,
      finally: finallyCallback
    });
    await expect(result).rejects.toThrow(error2);
    expect(catchCallback2).toHaveBeenCalledTimes(1);
    expect(finallyCallback).toHaveBeenCalledTimes(4);
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

  test('possiblyAsync.forEach() with a catch callback', async () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    const catchCallback = jest.fn(error => {
      expect(error).toBe(error1);
      return error2;
    });

    let accumulator = [];
    let result = possiblyAsync.forEach(
      [1, 2, 3, 4, 5],
      value => {
        if (value === 3) {
          throw error1;
        }
        accumulator.push(value * 2);
      },
      {catch: catchCallback}
    );
    expect(result).toBe(error2);
    expect(catchCallback).toHaveBeenCalledTimes(1);
    expect(accumulator).toEqual([2, 4]);

    accumulator = [];
    result = await possiblyAsync.forEach(
      [1, 2, 3, 4, 5],
      value => {
        if (value === 2) {
          return makePromise(() => {
            accumulator.push(value * 2);
          });
        }
        if (value === 3) {
          throw error1;
        }
        accumulator.push(value * 2);
      },
      {catch: catchCallback}
    );
    expect(result).toBe(error2);
    expect(catchCallback).toHaveBeenCalledTimes(2);
    expect(accumulator).toEqual([2, 4]);
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

  test('possiblyAsync.some()', async () => {
    const callback = jest.fn(value => value === 2);

    let result = possiblyAsync.some([1, 2, 3], callback);
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);

    result = possiblyAsync.some([1, -2, 3], callback);
    expect(result).toBe(false);
    expect(callback).toHaveBeenCalledTimes(5);

    result = await possiblyAsync.some([1, 2, 3], async value => {
      return callback(value);
    });
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalledTimes(7);

    result = await possiblyAsync.some([1, -2, 3], async value => {
      return callback(value);
    });
    expect(result).toBe(false);
    expect(callback).toHaveBeenCalledTimes(10);
  });

  test('possiblyAsync.mapValues()', async () => {
    let results = possiblyAsync.mapValues({a: 1, b: 2, c: 3}, value => value * 2);
    expect(results).toEqual({a: 2, b: 4, c: 6});

    results = await possiblyAsync.mapValues({a: 1, b: 2, c: 3}, value => {
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
