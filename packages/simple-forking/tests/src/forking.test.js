import isEqual from 'lodash/isEqual';

import {fork} from '../../..';

describe('Forking', () => {
  test('Basic forking', async () => {
    expect(fork(undefined)).toBe(undefined);
    expect(fork(null)).toBe(null);

    expect(fork(false)).toBe(false);
    expect(fork(true)).toBe(true);

    expect(fork(0)).toBe(0);
    expect(fork(123.45)).toBe(123.45);
    expect(fork(0 / 0)).toBe(0 / 0);

    expect(fork('')).toBe('');
    expect(fork('Hello')).toBe('Hello');

    const testForkObject = object => {
      const forkedObject = fork(object);

      expect(forkedObject !== object && isEqual(forkedObject, object)).toBe(true);
    };

    testForkObject(new Date('2020-01-25T08:40:53.407Z'));
    testForkObject(new Date('invalid'));

    testForkObject(/.*/);
    testForkObject(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/gm);

    testForkObject(new Error());
    testForkObject(new Error('Message'));
    testForkObject(
      Object.assign(new Error('Message'), {displayMessage: 'Display message', code: 'CODE'})
    );

    testForkObject({title: 'Inception', country: undefined, duration: 120});

    testForkObject([1, 2, undefined, 3]);

    const movie = {title: 'Inception', director: {name: 'Christopher Nolan'}};
    const forkedMovie = fork(movie);

    expect(Object.getPrototypeOf(forkedMovie)).toBe(movie);
    expect(Object.getPrototypeOf(forkedMovie.director)).toBe(movie.director);

    forkedMovie.title = 'Inception 2';
    forkedMovie.director.name = 'Christopher Nolan 2';

    expect(forkedMovie.title).toBe('Inception 2');
    expect(forkedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.title).toBe('Inception');
    expect(movie.director.name).toBe('Christopher Nolan');
  });

  test('Custom forking', async () => {
    class Movie {}

    function objectForker(object) {
      if (object instanceof Movie) {
        const movie = object;

        const forkedMovie = Object.create(movie);

        forkedMovie._forkedFrom = movie;

        return forkedMovie;
      }
    }

    const movie = new Movie();

    const forkedMovie = fork(movie, {objectForker});

    expect(Object.getPrototypeOf(forkedMovie)).toBe(movie);
    expect(forkedMovie._forkedFrom).toBe(movie);
  });
});
