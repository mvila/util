export function possiblyMany(value) {
  return Array.isArray(value) ? value : [value];
}

possiblyMany.get = function (value, index) {
  if (index !== undefined) {
    const values = value;
    if (!Array.isArray(values)) {
      throw new Error('Expected an array');
    }
    return values[index];
  }
  if (Array.isArray(value)) {
    throw new Error('Expected an index');
  }
  return value;
};

possiblyMany.call = function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = func(value, index);
      if (result !== undefined) {
        return result;
      }
    }
    return;
  }
  return func(value);
};

possiblyMany.callAsync = async function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = await func(value, index);
      if (result !== undefined) {
        return result;
      }
    }
    return;
  }
  return await func(value);
};

possiblyMany.map = function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    const results = [];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = func(value, index);
      results.push(result);
    }
    return results;
  }
  return func(value);
};

possiblyMany.mapAsync = async function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    const results = [];
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      const result = await func(value, index);
      results.push(result);
    }
    return results;
  }
  return await func(value);
};

possiblyMany.find = function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (func(value, index)) {
        return value;
      }
    }
    return undefined;
  }
  return func(value) ? value : undefined;
};

possiblyMany.findAsync = async function (value, func) {
  if (Array.isArray(value)) {
    const values = value;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (await func(value, index)) {
        return value;
      }
    }
    return undefined;
  }
  return (await func(value)) ? value : undefined;
};
