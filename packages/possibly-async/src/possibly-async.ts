import isPromise from 'is-promise';

export function possiblyAsync<V, R1 = V, R2 = never>(
  promise: PromiseLike<V>,
  onFulfilled?: (value: V) => R1,
  onRejected?: (reason: any) => R2
): PromiseLike<R1 | R2>;
export function possiblyAsync<V, R1 = V, R2 = never>(
  value: V,
  onFulfilled?: (value: V) => R1,
  onRejected?: (reason: any) => R2
): R1;
export function possiblyAsync<V, R1 = V, R2 = never>(
  valueOrPromise: V | PromiseLike<V>,
  onFulfilled?: (value: V) => R1,
  onRejected?: (reason: any) => R2
) {
  if (isPromise(valueOrPromise)) {
    return valueOrPromise.then(onFulfilled, onRejected);
  }

  return onFulfilled !== undefined ? onFulfilled(valueOrPromise) : valueOrPromise;
}
