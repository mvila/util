import {deserialize} from './deserialization';

describe('Deserialization', () => {
  test('Basic deserialization', async () => {
    expect(deserialize(undefined)).toBeUndefined();
    expect(deserialize({__undefined: true})).toBeUndefined();
    expect(deserialize(null)).toBe(null);

    expect(deserialize(false)).toBe(false);
    expect(deserialize(true)).toBe(true);

    expect(deserialize(0)).toBe(0);
    expect(deserialize(123.45)).toBe(123.45);

    expect(deserialize('')).toBe('');
    expect(deserialize('Hello')).toBe('Hello');

    expect(deserialize({__date: '2020-01-25T08:40:53.407Z'}).valueOf()).toBe(
      new Date('2020-01-25T08:40:53.407Z').valueOf()
    );

    let regExp = deserialize({__regExp: '/.*/'});
    expect(regExp).toBeInstanceOf(RegExp);
    expect(regExp.source).toBe('.*');
    expect(regExp.flags).toBe('');
    regExp = deserialize({__regExp: '/[^@ \\t\\r\\n]+@[^@ \\t\\r\\n]+\\.[^@ \\t\\r\\n]+/gm'});
    expect(regExp).toBeInstanceOf(RegExp);
    expect(regExp.source).toBe('[^@ \\t\\r\\n]+@[^@ \\t\\r\\n]+\\.[^@ \\t\\r\\n]+');
    expect(regExp.flags).toBe('gm');

    let error = deserialize({__error: ''});
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('');
    error = deserialize({__error: 'Message'});
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Message');
    expect(Object.keys(error)).toEqual([]);
    error = deserialize({__error: 'Message', displayMessage: 'Display message', code: 'CODE'});
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Message');
    expect(Object.keys(error)).toEqual(['displayMessage', 'code']);
    expect(error.displayMessage).toBe('Display message');
    expect(error.code).toBe('CODE');

    expect(
      deserialize({title: 'Inception', country: {__undefined: true}, duration: 120})
    ).toStrictEqual({
      title: 'Inception',
      country: undefined,
      duration: 120
    });

    expect(deserialize([1, 2, {__undefined: true}, 3])).toStrictEqual([1, 2, undefined, 3]);
  });

  test('Custom deserialization', async () => {
    class Movie {
      static limit?: number;

      static __deserialize(attributes: object) {
        Object.assign(this, attributes);
      }

      __deserialize(attributes: object) {
        Object.assign(this, attributes);
      }
    }

    expect(Movie.limit).toBeUndefined();

    function objectDeserializer(object: {[key: string]: any}): object | void {
      const {__Class: ClassName, __class: className, ...attributes} = object;

      if (ClassName === 'Movie') {
        Movie.__deserialize(attributes);
        return Movie;
      }

      if (className === 'Movie') {
        const movie = new Movie();
        movie.__deserialize(attributes);
        return movie;
      }
    }

    function functionDeserializer(object: {[key: string]: any}) {
      const {__function} = object;

      if (__function !== undefined) {
        // eslint-disable-next-line no-new-func
        return new Function(`return ${__function}`)();
      }
    }

    function errorHandler(error: Error) {
      throw error;
    }

    const options = {objectDeserializer, functionDeserializer, errorHandler};

    expect(deserialize({title: 'Inception'}, options)).toEqual({title: 'Inception'});

    const DeserializedMovie = deserialize({__Class: 'Movie', limit: 100}, options);

    expect(DeserializedMovie).toBe(Movie);
    expect(DeserializedMovie.limit).toBe(100);

    const deserializedMovie = deserialize({__class: 'Movie', title: 'Inception'}, options);

    expect(deserializedMovie).toBeInstanceOf(Movie);
    expect(deserializedMovie.title).toBe('Inception');

    const deserializedObject = deserialize(
      {currentMovie: {__class: 'Movie', title: 'Inception'}},
      options
    );

    expect(Object.keys(deserializedObject)).toEqual(['currentMovie']);
    expect(deserializedObject.currentMovie).toBeInstanceOf(Movie);
    expect(deserializedObject.currentMovie.title).toBe('Inception');

    const func = deserialize(
      {
        __function: 'function sum(a, b) { return a + b; }'
      },
      options
    );

    expect(typeof func).toBe('function');
    expect(func.name).toBe('sum');
    expect(func(1, 2)).toBe(3);

    expect(() => deserialize({__error: 'An error occurred'}, options)).toThrow('An error occurred');
  });
});
