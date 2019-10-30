import isPromise from 'is-promise';

/* eslint-disable prefer-arrow-callback */

const BREAK = Symbol('BREAK');

export function possiblyAsync(
  valueOrPromise,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  if (finallyCallback) {
    const finallyAndReturnCallback = function (value) {
      return possiblyAsync(finallyCallback(), {
        then() {
          return value;
        }
      });
    };

    const catchAndFinallyCallback = function (error) {
      const finallyAndThrowCallback = function (error) {
        const finallyCallbackResult = finallyCallback();
        return possiblyAsync(finallyCallbackResult, {
          then() {
            throw error;
          }
        });
      };

      if (!catchCallback) {
        return finallyAndThrowCallback(error);
      }

      try {
        const catchCallbackResult = catchCallback(error);
        return possiblyAsync(catchCallbackResult, {
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
}

function _possiblyAsync(valueOrPromise, thenCallbacks) {
  function callThenCallbacks(value) {
    if (thenCallbacks.length === 0) {
      return value;
    }

    const [thenCallback, ...remainingThenCallbacks] = thenCallbacks;

    const thenCallbackResult = thenCallback(value);
    return _possiblyAsync(thenCallbackResult, remainingThenCallbacks);
  }

  if (isPromise(valueOrPromise)) {
    return valueOrPromise.then(callThenCallbacks);
  }

  return callThenCallbacks(valueOrPromise);
}

possiblyAsync.call = function (callbacks, {catch: catchCallback, finally: finallyCallback} = {}) {
  return possiblyAsync(undefined, {
    then: callbacks,
    catch: catchCallback,
    finally: finallyCallback
  });
};

possiblyAsync.forEach = function (
  iterable,
  callback,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const iterator = iterable[Symbol.iterator]();

  const iterate = function () {
    const {value, done} = iterator.next();
    if (!done) {
      return possiblyAsync.call([
        function () {
          return callback(value);
        },
        function (callbackResult) {
          if (callbackResult !== BREAK) {
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
  iterable,
  mapper,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const results = [];
  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(mapper(value), {
        then(result) {
          results.push(result);
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
  iterable,
  reducer,
  accumulator,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(reducer(accumulator, value), {
        then(result) {
          accumulator = result;
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
  iterable,
  callback,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  let result = false;

  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(callback(value), {
        then(callbackResult) {
          if (callbackResult) {
            result = true;
            return BREAK;
          }
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

possiblyAsync.mapObject = function (
  object,
  mapper,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
) {
  if (!Array.isArray(thenCallbacks)) {
    thenCallbacks = [thenCallbacks];
  }

  const result = {};
  return possiblyAsync(
    possiblyAsync.forEach(Object.entries(object), function ([key, value]) {
      return possiblyAsync(mapper(value), {
        then(value) {
          result[key] = value;
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
  iterable,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
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
  valueOrPromise,
  {then: thenCallbacks = [], catch: catchCallback, finally: finallyCallback} = {}
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
