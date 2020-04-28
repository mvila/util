import isEqual from 'lodash/isEqual';

import {clone, cloneOptions} from './cloning';

describe('Cloning', () => {
  const testCloneObject = (object: object, options?: cloneOptions) => {
    const clonedObject = clone(object, options);

    expect(clonedObject !== object && isEqual(clonedObject, object)).toBe(true);
  };

  test('Basic cloning', async () => {
    expect(clone(undefined)).toBe(undefined);
    expect(clone(null)).toBe(null);

    expect(clone(false)).toBe(false);
    expect(clone(true)).toBe(true);

    expect(clone(0)).toBe(0);
    expect(clone(123.45)).toBe(123.45);
    expect(clone(0 / 0)).toBe(0 / 0);

    expect(clone('')).toBe('');
    expect(clone('Hello')).toBe('Hello');

    testCloneObject(new Date('2020-01-25T08:40:53.407Z'));
    testCloneObject(new Date('invalid'));

    testCloneObject(/.*/);
    testCloneObject(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/gm);

    testCloneObject(new Error());
    testCloneObject(new Error('Message'));
    testCloneObject(
      Object.assign(new Error('Message'), {displayMessage: 'Display message', code: 'CODE'})
    );

    testCloneObject({title: 'Inception', country: undefined, duration: 120});

    testCloneObject([1, 2, undefined, 3]);

    const movie = {title: 'Inception', director: {name: 'Christopher Nolan'}};
    const clonedMovie = clone(movie);

    clonedMovie.title = 'Inception 2';
    clonedMovie.director.name = 'Christopher Nolan 2';

    expect(clonedMovie.title).toBe('Inception 2');
    expect(clonedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.title).toBe('Inception');
    expect(movie.director.name).toBe('Christopher Nolan');
  });

  test('Custom cloning', async () => {
    class Component {
      clonedFrom?: Component;
    }

    class Movie extends Component {}

    function objectCloner(object: object): object | void {
      if (object instanceof Component) {
        const clonedObject = new (object.constructor as {new (): Component})();
        clonedObject.clonedFrom = object;
        return clonedObject;
      }
    }

    testCloneObject({title: 'Inception', country: undefined, duration: 120}, {objectCloner});

    const movie = new Movie();

    const clonedMovie = clone(movie, {objectCloner});

    expect(clonedMovie).toBeInstanceOf(Movie);
    expect(clonedMovie).not.toBe(movie);
    expect(clonedMovie.clonedFrom).toBe(movie);
  });
});
