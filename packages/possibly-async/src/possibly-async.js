import isPromise from 'is-promise';

/* eslint-disable prefer-arrow-callback */

export function possiblyAsync(valueOrPromise, func) {
  if (isPromise(valueOrPromise)) {
    return valueOrPromise.then(function (value) {
      return func(value);
    });
  }
  return func(valueOrPromise);
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
