import * as ta from 'type-assertions';

import {possiblyAsync} from './possibly-async';

describe('possibly-async', () => {
  test('possiblyAsync()', async () => {
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
    ta.assert<ta.Equal<typeof r7, PromiseLike<number>>>();
    await expect(r7).resolves.toBe(3);

    (function (valueProvider: () => number | PromiseLike<number>) {
      const r8 = possiblyAsync(valueProvider(), (value) => String(value + 1));
      ta.assert<ta.Equal<typeof r8, string | PromiseLike<string>>>();
    })(() => 1);

    const r9 = possiblyAsync(makePromise('ERROR'), (value) => value + 1);
    ta.assert<ta.Equal<typeof r9, PromiseLike<number>>>();
    await expect(r9).rejects.toBe('ERROR');

    const r10 = possiblyAsync(1, (_value) =>
      possiblyAsync(makePromise('ERROR'), (value) => value + 1)
    );
    ta.assert<ta.Equal<typeof r10, PromiseLike<number>>>();
    await expect(r10).rejects.toBe('ERROR');

    const r11 = possiblyAsync(
      makePromise('ERROR'),
      (value) => value + 1,
      (reason) => `${reason} (caught)`
    );
    ta.assert<ta.Equal<typeof r11, PromiseLike<number> | PromiseLike<string>>>();
    await expect(r11).resolves.toBe('ERROR (caught)');

    const r12 = possiblyAsync(
      makePromise('ERROR'),
      (value) => value + 1,
      (reason) => {
        throw new Error(`${reason} (rethrown)`);
      }
    );
    ta.assert<ta.Equal<typeof r12, PromiseLike<number> | PromiseLike<never>>>();
    await expect(r12).rejects.toThrow('ERROR (rethrown)');
  });

  test('possiblyAsync.invoke()', async () => {
    const r1 = possiblyAsync.invoke(
      () => 1,
      (value) => value + 1
    );
    ta.assert<ta.Equal<typeof r1, number>>();
    expect(r1).toBe(2);

    const r2 = possiblyAsync.invoke(
      () => makePromise(1),
      (value) => value + 1
    );
    ta.assert<ta.Equal<typeof r2, PromiseLike<number>>>();
    await expect(r2).resolves.toBe(2);

    expect(() =>
      possiblyAsync.invoke(
        () => {
          throw '1';
        },
        (value) => value + 1
      )
    ).toThrow('1');

    const r3 = possiblyAsync.invoke(
      () => {
        if (1 === 1) {
          throw 1;
        }

        return 1;
      },
      (value) => value + 1,
      (reason) => `${reason} (caught)`
    );
    ta.assert<ta.Equal<typeof r3, number | string>>();
    expect(r3).toBe('1 (caught)');

    const r4 = possiblyAsync.invoke(
      () => makePromise('ERROR'),
      (value) => value + 1,
      (reason) => `${reason} (caught)`
    );
    ta.assert<ta.Equal<typeof r4, PromiseLike<number> | PromiseLike<string>>>();
    await expect(r4).resolves.toBe('ERROR (caught)');

    const r5 = possiblyAsync.invoke(
      () => makePromise('ERROR'),
      (value) => value + 1,
      (reason) => {
        throw `${reason} (rethrown)`;
      }
    );
    ta.assert<ta.Equal<typeof r5, PromiseLike<number> | PromiseLike<never>>>();
    await expect(r5).rejects.toBe('ERROR (rethrown)');
  });

  test('possiblyAsync.forEach()', async () => {
    const a1: number[] = [];
    const r1 = possiblyAsync.forEach([1, 2], (v) => a1.push(v + 1));
    ta.assert<ta.Equal<typeof r1, void>>();
    expect(a1).toEqual([2, 3]);

    const a2: number[] = [];
    const r2 = possiblyAsync.forEach([1, 2], (v) => possiblyAsync(v + 1, (newV) => a2.push(newV)));
    ta.assert<ta.Equal<typeof r2, void>>();
    expect(a2).toEqual([2, 3]);

    const a3: number[] = [];
    const r3 = possiblyAsync.forEach([1, 2], (v) => makePromise(a3.push(v + 1)));
    ta.assert<ta.Equal<typeof r3, PromiseLike<void>>>();
    await r3;
    expect(a3).toEqual([2, 3]);

    const a4: number[] = [];
    const r4 = possiblyAsync.forEach([1, 2], (v) =>
      possiblyAsync(makePromise(v + 1), (newV) => a4.push(newV))
    );
    ta.assert<ta.Equal<typeof r4, PromiseLike<void>>>();
    await r4;
    expect(a4).toEqual([2, 3]);

    const a5: number[] = [];
    const r5 = possiblyAsync.forEach([1, 2], (v) =>
      v === 1 ? makePromise(a5.push(v + 1)) : a5.push(v + 1)
    );
    ta.assert<ta.Equal<typeof r5, void | PromiseLike<void>>>();
    await r5;
    expect(a5).toEqual([2, 3]);

    const a6: number[] = [];
    const r6 = possiblyAsync.forEach([1, 2], (v) =>
      v !== 2 ? a6.push(v + 1) : possiblyAsync.breakSymbol
    );
    ta.assert<ta.Equal<typeof r6, void>>();
    expect(a6).toEqual([2]);

    const a7: number[] = [];
    const r7 = possiblyAsync.forEach([1, 2], (v) =>
      makePromise(v !== 2 ? a7.push(v + 1) : possiblyAsync.breakSymbol)
    );
    ta.assert<ta.Equal<typeof r7, PromiseLike<void>>>();
    await r7;
    expect(a7).toEqual([2]);
  });

  test('possiblyAsync.map()', async () => {
    const r1 = possiblyAsync.map([1, 2], (v) => v + 1);
    ta.assert<ta.Equal<typeof r1, number[]>>();
    expect(r1).toEqual([2, 3]);

    const r2 = possiblyAsync.map([1, 2], (v) => possiblyAsync(v + 1, (v) => String(v)));
    ta.assert<ta.Equal<typeof r2, string[]>>();
    expect(r2).toEqual(['2', '3']);

    const r3 = possiblyAsync.map([1, 2], (v) => makePromise(v + 1));
    ta.assert<ta.Equal<typeof r3, PromiseLike<number[]>>>();
    await expect(r3).resolves.toEqual([2, 3]);

    const r4 = possiblyAsync.map([1, 2], (v) =>
      possiblyAsync(makePromise(v + 1), (v) => String(v))
    );
    ta.assert<ta.Equal<typeof r4, PromiseLike<string[]>>>();
    await expect(r4).resolves.toEqual(['2', '3']);

    const r5 = possiblyAsync.map([1, 2], (v) => (v === 1 ? makePromise(String(v + 1)) : v + 1));
    ta.assert<ta.Equal<typeof r5, (string | number)[] | PromiseLike<(string | number)[]>>>();
    await expect(r5).resolves.toEqual(['2', 3]);

    const r6 = possiblyAsync.map([1, 2, 3], (v) =>
      v !== 2 ? v + 1 : {[possiblyAsync.breakSymbol]: 'BREAK'}
    );
    ta.assert<ta.Equal<typeof r6, (number | string)[]>>();
    expect(r6).toEqual([2, 'BREAK']);

    const r7 = possiblyAsync.map([1, 2, 3], (v) =>
      makePromise(v !== 2 ? v + 1 : {[possiblyAsync.breakSymbol]: 'BREAK'})
    );
    ta.assert<ta.Equal<typeof r7, PromiseLike<(number | string)[]>>>();
    await expect(r7).resolves.toEqual([2, 'BREAK']);
  });

  test('possiblyAsync.mapValues()', async () => {
    const r1 = possiblyAsync.mapValues({x: 1, y: 2}, (v) => v + 1);
    ta.assert<ta.Equal<typeof r1, {[key: string]: number}>>();
    expect(r1).toEqual({x: 2, y: 3});

    const r2 = possiblyAsync.mapValues({x: 1, y: 2}, (v) => possiblyAsync(v + 1, (v) => String(v)));
    ta.assert<ta.Equal<typeof r2, {[key: string]: string}>>();
    expect(r2).toEqual({x: '2', y: '3'});

    const r3 = possiblyAsync.mapValues({x: 1, y: 2}, (v) => makePromise(v + 1));
    ta.assert<ta.Equal<typeof r3, PromiseLike<{[key: string]: number}>>>();
    await expect(r3).resolves.toEqual({x: 2, y: 3});

    const r4 = possiblyAsync.mapValues({x: 1, y: 2}, (v) =>
      possiblyAsync(makePromise(v + 1), (v) => String(v))
    );
    ta.assert<ta.Equal<typeof r4, PromiseLike<{[key: string]: string}>>>();
    await expect(r4).resolves.toEqual({x: '2', y: '3'});

    const r5 = possiblyAsync.mapValues({x: 1, y: 2}, (v) =>
      v === 1 ? makePromise(v + 1) : String(v + 1)
    );
    ta.assert<
      ta.Equal<
        typeof r5,
        {[key: string]: number | string} | PromiseLike<{[key: string]: number | string}>
      >
    >();
    await expect(r5).resolves.toEqual({x: 2, y: '3'});

    const r6 = possiblyAsync.mapValues({x: 1, y: 2, z: 3}, (v) =>
      v !== 2 ? v + 1 : {[possiblyAsync.breakSymbol]: 'BREAK'}
    );
    ta.assert<ta.Equal<typeof r6, {[key: string]: number | string}>>();
    expect(r6).toEqual({x: 2, y: 'BREAK'});

    const r7 = possiblyAsync.mapValues({x: 1, y: 2, z: 3}, (v) =>
      makePromise(v !== 2 ? v + 1 : {[possiblyAsync.breakSymbol]: 'BREAK'})
    );
    ta.assert<ta.Equal<typeof r7, PromiseLike<{[key: string]: number | string}>>>();
    await expect(r7).resolves.toEqual({x: 2, y: 'BREAK'});
  });

  test('possiblyAsync.some()', async () => {
    const r1 = possiblyAsync.some([1, 2, 3], (v) => v === 1);
    ta.assert<ta.Equal<typeof r1, boolean>>();
    expect(r1).toBe(true);

    const r2 = possiblyAsync.some([1, 2, 3], (v) => v === 2);
    ta.assert<ta.Equal<typeof r2, boolean>>();
    expect(r2).toBe(true);

    const r3 = possiblyAsync.some([1, 2, 3], (v) => v === 4);
    ta.assert<ta.Equal<typeof r3, boolean>>();
    expect(r3).toBe(false);

    let iterateeCalls = 0;
    const r4 = possiblyAsync.some([1, 2, 3], (v) => {
      iterateeCalls += 1;
      return v === 2;
    });
    ta.assert<ta.Equal<typeof r4, boolean>>();
    expect(r4).toBe(true);
    expect(iterateeCalls).toBe(2);

    const r5 = possiblyAsync.some([1, 2, 3], (v) => makePromise(v === 3));
    ta.assert<ta.Equal<typeof r5, PromiseLike<boolean>>>();
    await expect(r5).resolves.toBe(true);
  });

  test('possiblyAsync.all()', async () => {
    const r1 = possiblyAsync.all([1, 2, 3]);
    expect(r1).toEqual([1, 2, 3]);

    const r2 = possiblyAsync.all([1, makePromise(2), 3]);
    await expect(r2).resolves.toEqual([1, 2, 3]);
  });
});

function makePromise<V>(value: 'ERROR'): PromiseLike<never>;
function makePromise<V>(value: V): PromiseLike<V>;
function makePromise(value: any): any {
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
