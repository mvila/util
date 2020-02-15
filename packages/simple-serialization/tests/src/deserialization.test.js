import {deserialize} from '../../..';

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

    expect(deserialize({__class: 'Date', __value: '2020-01-25T08:40:53.407Z'}).valueOf()).toBe(
      new Date('2020-01-25T08:40:53.407Z').valueOf()
    );

    let func = deserialize({
      __class: 'Function',
      __value: 'function sum(a, b) { return a + b; }'
    });
    expect(typeof func).toBe('function');
    expect(Object.keys(func)).toEqual([]);
    expect(func.name).toBe('sum');
    expect(func(1, 2)).toBe(3);
    func = deserialize({
      __class: 'Function',
      __value: 'function sum(a, b) { return a + b; }',
      displayName: 'sum'
    });
    expect(typeof func).toBe('function');
    expect(func.name).toBe('sum');
    expect(Object.keys(func)).toEqual(['displayName']);
    expect(func.displayName).toBe('sum');
    expect(func(1, 2)).toBe(3);

    let error = deserialize({__class: 'Error'});
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('');
    error = deserialize({__class: 'Error', message: 'Message'});
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Message');
    expect(Object.keys(error)).toEqual([]);
    error = deserialize({
      __class: 'Error',
      message: 'Message',
      displayMessage: 'Display message',
      code: 'CODE'
    });
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
      static __deserialize(attributes) {
        Object.assign(this, attributes);
      }

      __deserialize(attributes) {
        Object.assign(this, attributes);
      }
    }

    expect(Movie.limit).toBeUndefined();

    function objectHandler(object) {
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

    const DeserializedMovie = deserialize({__Class: 'Movie', limit: 100}, {objectHandler});

    expect(DeserializedMovie).toBe(Movie);
    expect(DeserializedMovie.limit).toBe(100);

    const deserializedMovie = deserialize({__class: 'Movie', title: 'Inception'}, {objectHandler});

    expect(deserializedMovie).toBeInstanceOf(Movie);
    expect(deserializedMovie.title).toBe('Inception');

    const deserializedObject = deserialize(
      {currentMovie: {__class: 'Movie', title: 'Inception'}},
      {objectHandler}
    );

    expect(Object.keys(deserializedObject)).toEqual(['currentMovie']);
    expect(deserializedObject.currentMovie).toBeInstanceOf(Movie);
    expect(deserializedObject.currentMovie.title).toBe('Inception');
  });
});
