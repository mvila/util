import isPromise from 'is-promise';

/* eslint-disable prefer-arrow-callback */

export function possiblyAsync(valueOrPromise, callback, ...remainingCallbacks) {
  function runCallback(value) {
    const result = callback(value);

    const remainingCallback = remainingCallbacks.shift();

    if (remainingCallback !== undefined) {
      return possiblyAsync(result, remainingCallback, ...remainingCallbacks);
    }

    return result;
  }

  if (isPromise(valueOrPromise)) {
    const promise = valueOrPromise;

    return promise.then(function (value) {
      return runCallback(value);
    });
  }

  const value = valueOrPromise;

  return runCallback(value);
}

possiblyAsync.forEach = function (iterable, func) {
  const iterator = iterable[Symbol.iterator]();

  const iterate = function () {
    const {value, done} = iterator.next();
    if (!done) {
      return possiblyAsync(func(value), function () {
        return iterate();
      });
    }
  };

  return iterate();
};

possiblyAsync.map = function (iterable, mapper) {
  const results = [];
  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(mapper(value), function (result) {
        results.push(result);
      });
    }),
    function () {
      return results;
    }
  );
};

possiblyAsync.reduce = function (iterable, reducer, accumulator) {
  return possiblyAsync(
    possiblyAsync.forEach(iterable, function (value) {
      return possiblyAsync(reducer(accumulator, value), function (result) {
        accumulator = result;
      });
    }),
    function () {
      return accumulator;
    }
  );
};

possiblyAsync.mapObject = function (object, mapper) {
  const result = {};
  return possiblyAsync(
    possiblyAsync.forEach(Object.entries(object), function ([key, value]) {
      return possiblyAsync(mapper(value), function (value) {
        result[key] = value;
      });
    }),
    function () {
      return result;
    }
  );
};

possiblyAsync.all = function (iterable) {
  return possiblyAsync.map(iterable, function (value) {
    return value;
  });
};

possiblyAsync.possiblyMany = function (valueOrPromise) {
  if (Array.isArray(valueOrPromise)) {
    return possiblyAsync.all(valueOrPromise);
  }
  return valueOrPromise;
};
