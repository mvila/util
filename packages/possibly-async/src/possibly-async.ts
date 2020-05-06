import isPromise from 'is-promise';

export function possiblyAsync<V, R>(
  promise: PromiseLike<V>,
  callback: (value: V) => R
): PromiseLike<R>;
export function possiblyAsync<V, R>(value: V, callback: (value: V) => R): R;
export function possiblyAsync<V, R>(valueOrPromise: V | PromiseLike<V>, callback: (value: V) => R) {
  return isPromise(valueOrPromise) ? valueOrPromise.then(callback) : callback(valueOrPromise);
}
