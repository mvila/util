import {hasOwnProperty} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';

export type deserializeOptions = {
  objectDeserializer?: (object: object) => object | void;
  functionDeserializer?: (object: object) => Function | void;
  errorHandler?: (error: Error) => any;
};

export function deserialize(value: any, options?: deserializeOptions): any {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return deserializeArray(value, options);
  }

  if (typeof value === 'object') {
    return deserializeObjectOrFunction(value, options);
  }

  return value;
}

function deserializeObjectOrFunction(object: {[key: string]: any}, options?: deserializeOptions) {
  if (hasOwnProperty(object, '__undefined') && object.__undefined === true) {
    return undefined;
  }

  if (hasOwnProperty(object, '__date')) {
    return deserializeDate(object);
  }

  if (hasOwnProperty(object, '__regExp')) {
    return deserializeRegExp(object);
  }

  if (hasOwnProperty(object, '__error')) {
    return possiblyAsync(deserializeError(object, options), {
      then: (error) => {
        const errorHandler = options?.errorHandler;

        if (errorHandler !== undefined) {
          return errorHandler(error);
        }

        return error;
      }
    });
  }

  const objectDeserializer = options?.objectDeserializer;

  if (objectDeserializer !== undefined) {
    const deserializedObject = objectDeserializer(object);

    if (deserializedObject !== undefined) {
      return deserializedObject;
    }
  }

  const functionDeserializer = options?.functionDeserializer;

  if (functionDeserializer !== undefined) {
    const deserializedFunction = functionDeserializer(object);

    if (deserializedFunction !== undefined) {
      return deserializedFunction;
    }
  }

  return deserializeAttributes(object, options);
}

function deserializeDate(object: {[key: string]: any}) {
  return new Date(object.__date);
}

function deserializeRegExp(object: {[key: string]: any}) {
  const {__regExp: regExp} = object;

  const fragments = regExp.match(/\/(.*?)\/([a-z]*)?$/i);

  if (fragments === null) {
    throw new Error(`Cannot deserialize an invalid RegExp ('${regExp}')`);
  }

  const [, source, flags] = fragments;

  return new RegExp(source, flags);
}

function deserializeError(object: {[key: string]: any}, options?: deserializeOptions) {
  const {__error: message, ...attributes} = object;

  const deserializedError = new Error(message);

  return possiblyAsync(deserializeAttributes(attributes, options), {
    then: (deserializedAttributes) => {
      Object.assign(deserializedError, deserializedAttributes);
      return deserializedError;
    }
  });
}

function deserializeAttributes(object: object, options?: deserializeOptions) {
  return possiblyAsync.mapValues(object, (value) => deserialize(value, options));
}

function deserializeArray(array: any[], options?: deserializeOptions) {
  return possiblyAsync.map(array, (item) => deserialize(item, options));
}
