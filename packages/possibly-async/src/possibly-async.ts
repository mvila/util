import isPromise from 'is-promise';

export type PromiseLikeValue<Input> = Input extends PromiseLike<infer Value> ? Value : Input;

export function possiblyAsync<
  ValueOrPromise,
  OnFulfilledResult,
  OnRejectedResult = never,
  Value = PromiseLikeValue<ValueOrPromise>,
  Result = ValueOrPromise extends PromiseLike<Value>
    ? PromiseLike<OnFulfilledResult> | PromiseLike<OnRejectedResult>
    : OnFulfilledResult
>(
  valueOrPromise: ValueOrPromise,
  onFulfilled: (value: Value) => OnFulfilledResult,
  onRejected?: (reason: any) => OnRejectedResult
): Result;
export function possiblyAsync(
  valueOrPromise: any,
  onFulfilled: (value: any) => any,
  onRejected?: (reason: any) => any
) {
  return isPromise(valueOrPromise)
    ? valueOrPromise.then(onFulfilled, onRejected)
    : onFulfilled(valueOrPromise);
}

export namespace possiblyAsync {
  export function forEach<
    Value,
    IterateeResultValueOrPromise,
    IterateeResultValue = PromiseLikeValue<IterateeResultValueOrPromise>,
    Result = IterateeResultValueOrPromise extends PromiseLike<IterateeResultValue>
      ? PromiseLike<void>
      : void
  >(
    iterable: Iterable<Value>,
    iteratee: (value: Value, index: number) => IterateeResultValueOrPromise
  ): Result;
  export function forEach(iterable: any, iteratee: (value: any, index: number) => any) {
    const iterator = iterable[Symbol.iterator]();
    let index = 0;

    const iterate = (): any => {
      const {value, done} = iterator.next();

      if (!done) {
        return possiblyAsync(iteratee(value, index++), iterate);
      }
    };

    return iterate();
  }

  export function map<
    Value,
    MapperResultValueOrPromise,
    MapperResultValue = PromiseLikeValue<MapperResultValueOrPromise>,
    Result = MapperResultValueOrPromise extends PromiseLike<MapperResultValue>
      ? PromiseLike<MapperResultValue[]>
      : MapperResultValue[]
  >(
    iterable: Iterable<Value>,
    mapper: (value: Value, index: number) => MapperResultValueOrPromise
  ): Result;
  export function map(iterable: any, mapper: (value: any, index: number) => any) {
    let result: any[] = [];

    return possiblyAsync(
      possiblyAsync.forEach(iterable, (value, index) =>
        possiblyAsync(mapper(value, index), (mappedValue) => {
          result.push(mappedValue);
        })
      ),
      () => result
    );
  }

  export function mapValues<
    Value,
    MapperResultValueOrPromise,
    MapperResultValue = PromiseLikeValue<MapperResultValueOrPromise>,
    Result = MapperResultValueOrPromise extends PromiseLike<MapperResultValue>
      ? PromiseLike<{[key: string]: MapperResultValue}>
      : {[key: string]: MapperResultValue}
  >(
    object: {[key: string]: Value},
    mapper: (value: Value, key: string) => MapperResultValueOrPromise
  ): Result;
  export function mapValues(object: any, mapper: (value: any, key: string) => any) {
    let result: {[key: string]: any} = {};

    return possiblyAsync(
      possiblyAsync.forEach(Object.entries(object), ([key, value]) =>
        possiblyAsync(mapper(value, key), (mappedValue) => {
          result[key] = mappedValue;
        })
      ),
      () => result
    );
  }
}
