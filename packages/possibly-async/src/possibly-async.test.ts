import * as ta from 'type-assertions';

import {possiblyAsync} from './possibly-async';

describe('possibly-async', () => {
  test('possiblyAsync(value)', async () => {
    const r1 = possiblyAsync(1);
    ta.assert<ta.Equal<typeof r1, number>>();
    expect(r1).toBe(1);

    const r2 = possiblyAsync(makePromise(1));
    ta.assert<ta.Equal<typeof r2, PromiseLike<number>>>();
    await expect(r2).resolves.toBe(1);

    const r3 = possiblyAsync(makePromise('ERROR'));
    ta.assert<ta.Equal<typeof r3, PromiseLike<never>>>();
    await expect(r3).rejects.toBe('ERROR');
  });

  test('possiblyAsync(value, onFulfilled)', async () => {
    const r1 = possiblyAsync(1, (value) => value + 1);
    ta.assert<ta.Equal<typeof r1, number>>();
    expect(r1).toBe(2);

    const r2 = possiblyAsync(1, (value) => String(value));
    ta.assert<ta.Equal<typeof r2, string>>();
    expect(r2).toBe('1');

    const r3 = possiblyAsync(1, (value) => possiblyAsync(value + 1, (value) => String(value)));
    ta.assert<ta.Equal<typeof r3, string>>();
    expect(r3).toBe('2');

    const r4 = possiblyAsync(makePromise(1), (value) => value + 1);
    ta.assert<ta.Equal<typeof r4, PromiseLike<number>>>();
    await expect(r4).resolves.toBe(2);

    const r5 = possiblyAsync(makePromise(1), (value) => String(value));
    ta.assert<ta.Equal<typeof r5, PromiseLike<string>>>();
    await expect(r5).resolves.toBe('1');

    const r6 = possiblyAsync(1, (value) =>
      possiblyAsync(makePromise(value), (value) => String(value))
    );
    ta.assert<ta.Equal<typeof r6, PromiseLike<string>>>();
    await expect(r6).resolves.toBe('1');

    const r7 = possiblyAsync(makePromise(1), (value) =>
      possiblyAsync(makePromise(value + 1), (value) => value + 1)
    );
    ta.assert<ta.Equal<typeof r7, PromiseLike<PromiseLike<number>>>>();
    await expect(r7).resolves.toBe(3);

    const r8 = possiblyAsync(makePromise('ERROR'), (value) => value + 1);
    ta.assert<ta.Equal<typeof r8, PromiseLike<number>>>();
    await expect(r8).rejects.toBe('ERROR');

    const r9 = possiblyAsync(1, (_value) =>
      possiblyAsync(makePromise('ERROR'), (value) => value + 1)
    );
    ta.assert<ta.Equal<typeof r9, PromiseLike<number>>>();
    await expect(r9).rejects.toBe('ERROR');
  });

  test('possiblyAsync(value, onFulfilled, onRejected)', async () => {
    const r1 = possiblyAsync(
      1,
      (value) => value + 1,
      (reason) => ({reason})
    );
    ta.assert<ta.Equal<typeof r1, number>>();
    expect(r1).toBe(2);

    const r2 = possiblyAsync(1, (value) =>
      possiblyAsync(
        value,
        (value) => String(value),
        (reason) => ({reason})
      )
    );
    ta.assert<ta.Equal<typeof r2, string>>();
    expect(r2).toBe('1');

    const r3 = possiblyAsync(
      makePromise(1),
      (value) => value + 1,
      (reason) => ({reason})
    );
    ta.assert<ta.Equal<typeof r3, PromiseLike<number | {reason: any}>>>();
    await expect(r3).resolves.toBe(2);

    const r4 = possiblyAsync(1, (value) =>
      possiblyAsync(
        makePromise(value),
        (value) => String(value),
        (reason) => ({reason})
      )
    );
    ta.assert<ta.Equal<typeof r4, PromiseLike<string | {reason: any}>>>();
    await expect(r4).resolves.toBe('1');

    const r5 = possiblyAsync(
      makePromise('ERROR'),
      (value) => value + 1,
      (reason) => ({reason})
    );
    ta.assert<ta.Equal<typeof r5, PromiseLike<number | {reason: any}>>>();
    await expect(r5).resolves.toEqual({reason: 'ERROR'});
  });
});

function makePromise<V>(value: 'ERROR'): PromiseLike<never>;
function makePromise<V>(value: V): PromiseLike<V>;
function makePromise<V>(value: V): PromiseLike<V> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof value === 'string' && value === 'ERROR') {
        reject(value);
      } else {
        resolve(value);
      }
    }, 5);
  });
}
