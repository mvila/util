import isPromise from 'is-promise';

const breakSymbol = Symbol('BREAK');

type thenCallback = (value: any) => any;
type catchCallback = (value: any) => any;
type finallyCallback = () => void;

type thenCatchFinallyCallbacks = {
  then?: thenCallback | thenCallback[];
  catch?: catchCallback;
  finally?: finallyCallback;
};

export const possiblyAsync = function possiblyAsync(
  valueOrPromise: any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
): any {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  if (finallyCallback) {
    const finallyAndReturnCallback = function (value: any) {
      return possiblyAsync(finallyCallback(), {
        then() {
          return value;
        }
      });
    };

    const catchAndFinallyCallback = function (error: any) {
      const finallyAndThrowCallback = function (error: any) {
        return possiblyAsync(finallyCallback(), {
          then() {
            throw error;
          }
        });
      };

      if (!catchCallback) {
        return finallyAndThrowCallback(error);
      }

      try {
        return possiblyAsync(catchCallback(error), {
          then: finallyAndReturnCallback,
          catch: finallyAndThrowCallback
        });
      } catch (error) {
        return finallyAndThrowCallback(error);
      }
    };

    return possiblyAsync(valueOrPromise, {
      then: [...thenCallbacks, finallyAndReturnCallback],
      catch: catchAndFinallyCallback
    });
  }

  try {
    let result = _possiblyAsync(valueOrPromise, thenCallbacks);

    if (isPromise(result) && catchCallback) {
      result = result.catch(catchCallback);
    }

    return result;
  } catch (error) {
    if (!catchCallback) {
      throw error;
    }

    return catchCallback(error);
  }
};

function _possiblyAsync(valueOrPromise: any, thenCallbacks: thenCallback[]): any {
  function callThenCallbacks(value: any) {
    if (thenCallbacks.length === 0) {
      return value;
    }

    const [thenCallback, ...remainingThenCallbacks] = thenCallbacks;

    return _possiblyAsync(thenCallback(value), remainingThenCallbacks);
  }

  if (isPromise(valueOrPromise)) {
    return valueOrPromise.then(callThenCallbacks);
  }

  return callThenCallbacks(valueOrPromise);
}

possiblyAsync.call = function (
  callbacks: thenCallback | thenCallback[],
  {
    catch: catchCallback,
    finally: finallyCallback
  }: {
    catch?: catchCallback;
    finally?: finallyCallback;
  } = {}
) {
  return possiblyAsync(undefined, {
    then: callbacks,
    catch: catchCallback,
    finally: finallyCallback
  });
};

possiblyAsync.forEach = function (
  iterable: Iterable<any>,
  iteratee: (value: any) => any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const iterator = iterable[Symbol.iterator]();

  const iterate = function (): any {
    const {value, done} = iterator.next();

    if (!done) {
      return possiblyAsync.call([
        function () {
          return iteratee(value);
        },
        function (callbackResult) {
          if (callbackResult !== breakSymbol) {
            return iterate();
          }
        }
      ]);
    }
  };

  return possiblyAsync.call([iterate, ...thenCallbacks], {
    catch: catchCallback,
    finally: finallyCallback
  });
};

possiblyAsync.map = function (
  iterable: Iterable<any>,
  mapper: (value: any) => any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const results: any[] = [];

  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(mapper(value), {
        then(result) {
          if (isBreaking(result)) {
            results.push(result[breakSymbol]);
            return breakSymbol;
          }

          results.push(result);
          return undefined;
        }
      });
    }),
    {
      then: [
        function () {
          return results;
        },
        ...thenCallbacks
      ],
      catch: catchCallback,
      finally: finallyCallback
    }
  );
};

possiblyAsync.reduce = function (
  iterable: Iterable<any>,
  reducer: (accumulator: any, value: any) => any,
  accumulator: any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(reducer(accumulator, value), {
        then(result) {
          if (isBreaking(result)) {
            accumulator = result[breakSymbol];
            return breakSymbol;
          }

          accumulator = result;
          return undefined;
        }
      });
    }),
    {
      then: [
        function () {
          return accumulator;
        },
        ...thenCallbacks
      ],
      catch: catchCallback,
      finally: finallyCallback
    }
  );
};

possiblyAsync.some = function (
  iterable: Iterable<any>,
  iteratee: (value: any) => any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  let result = false;

  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(iteratee(value), {
        then(callbackResult) {
          if (callbackResult) {
            result = true;
            return breakSymbol;
          }

          return undefined;
        }
      });
    }),
    {
      then: [
        function () {
          return result;
        },
        ...thenCallbacks
      ],
      catch: catchCallback,
      finally: finallyCallback
    }
  );
};

possiblyAsync.mapValues = function (
  object: object,
  mapper: (value: any) => any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const result: {[key: string]: any} = {};

  return possiblyAsync(
    possiblyAsync.forEach(Object.entries(object), function ([key, value]) {
      return possiblyAsync(mapper(value), {
        then(value) {
          if (isBreaking(value)) {
            result[key] = value[breakSymbol];
            return breakSymbol;
          }

          result[key] = value;
          return undefined;
        }
      });
    }),
    {
      then: [
        function () {
          return result;
        },
        ...thenCallbacks
      ],
      catch: catchCallback,
      finally: finallyCallback
    }
  );
};

possiblyAsync.all = function (
  iterable: Iterable<any>,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  return possiblyAsync.map(
    iterable,
    function (value) {
      return value;
    },
    {then: thenCallbacks, catch: catchCallback, finally: finallyCallback}
  );
};

possiblyAsync.possiblyMany = function (
  valueOrPromise: any,
  {
    then: thenCallbacks = [],
    catch: catchCallback,
    finally: finallyCallback
  }: thenCatchFinallyCallbacks = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  if (Array.isArray(valueOrPromise)) {
    valueOrPromise = possiblyAsync.all(valueOrPromise);
  }

  return possiblyAsync(valueOrPromise, {
    then: thenCallbacks,
    catch: catchCallback,
    finally: finallyCallback
  });
};

possiblyAsync.breakSymbol = breakSymbol;

function isBreaking(value: any) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, breakSymbol)
  );
}
