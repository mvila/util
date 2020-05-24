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
  export function invoke<
    ValueOrPromise,
    OnFulfilledResult,
    OnRejectedResult = never,
    Value = PromiseLikeValue<ValueOrPromise>,
    Result = ValueOrPromise extends PromiseLike<Value>
      ? PromiseLike<OnFulfilledResult> | PromiseLike<OnRejectedResult>
      : OnFulfilledResult | OnRejectedResult
  >(
    func: () => ValueOrPromise,
    onFulfilled: (value: Value) => OnFulfilledResult,
    onRejected?: (reason: any) => OnRejectedResult
  ): Result;
  export function invoke(
    func: () => any,
    onFulfilled: (value: any) => any,
    onRejected?: (reason: any) => any
  ) {
    try {
      return possiblyAsync(func(), onFulfilled, onRejected);
    } catch (error) {
      if (onRejected !== undefined) {
        return onRejected(error);
      }

      throw error;
    }
  }

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
        return possiblyAsync(iteratee(value, index++), (result: any) => {
          if (result !== breakSymbol) {
            return iterate();
          }
        });
      }
    };

    return iterate();
  }

  export function map<
    Value,
    MapperResultValueOrPromise,
    MapperResultValue = PromiseLikeValue<MapperResultValueOrPromise>,
    UnwrappedMapperResultValue = MapperResultValue extends {[breakSymbol]: infer UnwrappedValue}
      ? UnwrappedValue
      : MapperResultValue,
    Result = MapperResultValueOrPromise extends PromiseLike<MapperResultValue>
      ? PromiseLike<UnwrappedMapperResultValue[]>
      : UnwrappedMapperResultValue[]
  >(
    iterable: Iterable<Value>,
    mapper: (value: Value, index: number) => MapperResultValueOrPromise
  ): Result;
  export function map(iterable: any, mapper: (value: any, index: number) => any) {
    let result: any[] = [];

    return possiblyAsync(
      possiblyAsync.forEach(iterable, (value, index) =>
        possiblyAsync(mapper(value, index), (mappedValue): void | typeof breakSymbol => {
          if (isBreaking(mappedValue)) {
            result.push(mappedValue[breakSymbol]);
            return breakSymbol;
          }

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
    UnwrappedMapperResultValue = MapperResultValue extends {[breakSymbol]: infer UnwrappedValue}
      ? UnwrappedValue
      : MapperResultValue,
    Result = MapperResultValueOrPromise extends PromiseLike<MapperResultValue>
      ? PromiseLike<{[key: string]: UnwrappedMapperResultValue}>
      : {[key: string]: UnwrappedMapperResultValue}
  >(
    object: {[key: string]: Value},
    mapper: (value: Value, key: string) => MapperResultValueOrPromise
  ): Result;
  export function mapValues(object: any, mapper: (value: any, key: string) => any) {
    let result: {[key: string]: any} = {};

    return possiblyAsync(
      possiblyAsync.forEach(Object.entries(object), ([key, value]) =>
        possiblyAsync(mapper(value, key), (mappedValue): void | typeof breakSymbol => {
          if (isBreaking(mappedValue)) {
            result[key] = mappedValue[breakSymbol];
            return breakSymbol;
          }

          result[key] = mappedValue;
        })
      ),
      () => result
    );
  }

  export const breakSymbol = Symbol('BREAK');

  function isBreaking(value: any) {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.prototype.hasOwnProperty.call(value, breakSymbol)
    );
  }
}
