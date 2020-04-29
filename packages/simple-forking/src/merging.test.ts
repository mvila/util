import {fork} from './forking';
import {merge} from './merging';

describe('Merging', () => {
  test('Basic merging', async () => {
    let movie = {title: 'Inception', director: {name: 'Christopher Nolan'}};
    const forkedMovie = fork(movie);

    forkedMovie.title = 'Inception 2';
    forkedMovie.director.name = 'Christopher Nolan 2';

    let mergedMovie = merge(movie, forkedMovie);

    expect(mergedMovie).toBe(movie);
    expect(mergedMovie.director).toBe(movie.director);

    expect(movie.title).toBe('Inception 2');
    expect(movie.director.name).toBe('Christopher Nolan 2');

    movie = {title: 'Inception', director: {name: 'Christopher Nolan'}};
    const otherMovie = {title: 'Inception 2', director: {name: 'Christopher Nolan 2'}};

    mergedMovie = merge(movie, otherMovie);

    expect(mergedMovie).not.toBe(movie);
    expect(mergedMovie).not.toBe(otherMovie);
    expect(mergedMovie.director).not.toBe(movie.director);
    expect(mergedMovie.director).not.toBe(otherMovie.director);

    expect(mergedMovie.title).toBe('Inception 2');
    expect(mergedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.title).toBe('Inception');
    expect(movie.director.name).toBe('Christopher Nolan');
  });

  test('Custom merging', async () => {
    class Movie {
      constructor(public title: string) {}
    }

    function objectForker(object: object) {
      if (object instanceof Movie) {
        const movie = object;

        const forkedMovie = Object.create(movie);

        forkedMovie.title = movie.title;

        return forkedMovie;
      }
    }

    function objectMerger(object: object, forkedObject: object): object | void {
      if (object instanceof Movie && forkedObject instanceof Movie) {
        const movie = object;
        const forkedMovie = forkedObject;

        movie.title = forkedMovie.title;
        (movie as any)._mergedFrom = forkedMovie;

        return movie;
      }
    }

    const movie = new Movie('Inception');

    const forkedMovie = fork(movie, {objectForker});

    forkedMovie.title = 'Inception 2';

    const mergedMovie = merge(movie, forkedMovie, {objectMerger});

    expect(mergedMovie).toBe(movie);
    expect(mergedMovie.title).toBe('Inception 2');
    expect(mergedMovie._mergedFrom).toBe(forkedMovie);
  });
});
