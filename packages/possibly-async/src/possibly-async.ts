import isPromise from 'is-promise';

export type PromiseLikeValue<Input> = Input extends PromiseLike<infer Value> ? Value : Input;

export function possiblyAsync<
  ValueOrPromise,
  CallbackResult,
  Value = PromiseLikeValue<ValueOrPromise>,
  Result = ValueOrPromise extends PromiseLike<Value> ? PromiseLike<CallbackResult> : CallbackResult
>(valueOrPromise: ValueOrPromise, callback: (value: Value) => CallbackResult): Result;
export function possiblyAsync(valueOrPromise: any, callback: (value: any) => any) {
  return isPromise(valueOrPromise) ? valueOrPromise.then(callback) : callback(valueOrPromise);
}

export namespace possiblyAsync {
  export function forEach<
    Value,
    IterateeResultValueOrPromise,
    CallbackResult,
    IterateeResultValue = PromiseLikeValue<IterateeResultValueOrPromise>,
    Result = IterateeResultValueOrPromise extends PromiseLike<IterateeResultValue>
      ? PromiseLike<CallbackResult>
      : CallbackResult
  >(
    iterable: Iterable<Value>,
    iteratee: (value: Value, index: number) => IterateeResultValueOrPromise,
    callback: () => CallbackResult
  ): Result {
    const iterator = iterable[Symbol.iterator]();
    let index = 0;

    const iterate = function (): void | PromiseLike<void> {
      const {value, done} = iterator.next();

      if (!done) {
        return possiblyAsync(iteratee(value, index++), iterate);
      }
    };

    return possiblyAsync(iterate(), callback);
  }
}
