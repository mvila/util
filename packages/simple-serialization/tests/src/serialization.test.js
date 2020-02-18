import {serialize} from '../../..';

describe('Serialization', () => {
  test('Basic serialization', async () => {
    expect(serialize(undefined)).toEqual({__undefined: true});
    expect(serialize(null)).toBe(null);

    expect(serialize(false)).toBe(false);
    expect(serialize(true)).toBe(true);

    expect(serialize(0)).toBe(0);
    expect(serialize(123.45)).toBe(123.45);
    expect(() => serialize(0 / 0)).toThrow('Cannot serialize a NaN value');

    expect(serialize('')).toBe('');
    expect(serialize('Hello')).toBe('Hello');

    expect(serialize(new Date('2020-01-25T08:40:53.407Z'))).toEqual({
      __class: 'Date',
      __value: '2020-01-25T08:40:53.407Z'
    });
    expect(() => serialize(new Date('invalid'))).toThrow('Cannot serialize an invalid date');

    expect(serialize(new Error())).toStrictEqual({__class: 'Error'});
    expect(serialize(new Error('Message'))).toStrictEqual({__class: 'Error', message: 'Message'});
    expect(
      serialize(
        Object.assign(new Error('Message'), {displayMessage: 'Display message', code: 'CODE'})
      )
    ).toStrictEqual({
      __class: 'Error',
      message: 'Message',
      displayMessage: 'Display message',
      code: 'CODE'
    });

    expect(serialize({title: 'Inception', country: undefined, duration: 120})).toEqual({
      title: 'Inception',
      country: {__undefined: true},
      duration: 120
    });

    expect(serialize([1, 2, undefined, 3])).toEqual([1, 2, {__undefined: true}, 3]);

    const movie = {
      title: 'Inception',
      _hidden: true,
      toJSON() {
        return {title: this.title};
      }
    };

    expect(serialize(movie)).toEqual({title: 'Inception'});
  });

  test('Custom serialization', async () => {
    class Movie {
      static limit = 100;

      static __serialize() {
        return {__Class: 'Movie', ...this};
      }

      __serialize() {
        return {__class: 'Movie', ...this};
      }
    }

    function objectHandler(object) {
      if (typeof object.__serialize === 'function') {
        return object.__serialize();
      }
    }

    function functionHandler(func) {
      return {
        __function: func.toString()
      };
    }

    const options = {objectHandler, functionHandler};

    expect(serialize({title: 'Inception'}, options)).toEqual({title: 'Inception'});

    expect(serialize(Movie, options)).toEqual({__Class: 'Movie', limit: 100});

    const movie = new Movie();
    movie.title = 'Inception';

    expect(serialize(movie, options)).toEqual({__class: 'Movie', title: 'Inception'});
    expect(serialize({currentMovie: movie}, options)).toEqual({
      currentMovie: {
        __class: 'Movie',
        title: 'Inception'
      }
    });

    function sum(a, b) {
      return a + b;
    }

    expect(serialize(sum, options)).toEqual({
      __function: 'function sum(a, b) {\n      return a + b;\n    }'
    });
  });
});
