import {getTypeOf} from './utilities';

describe('Utilities', () => {
  test('getTypeOf()', async () => {
    expect(getTypeOf(undefined)).toBe('undefined');
    expect(getTypeOf(null)).toBe('null');
    expect(getTypeOf(true)).toBe('boolean');
    expect(getTypeOf(123)).toBe('number');
    expect(getTypeOf('abc')).toBe('string');
    expect(getTypeOf([1, 2, 3])).toBe('Array');
    expect(getTypeOf({})).toBe('Object');
    expect(getTypeOf(() => {})).toBe('Function');
    expect(getTypeOf(function () {})).toBe('Function');
    expect(getTypeOf(new Date())).toBe('Date');
    expect(getTypeOf(/abc/)).toBe('RegExp');
    expect(getTypeOf(new Error())).toBe('Error');

    class Movie {
      static displayName: string;
      static humanName: string;
    }

    const movie = new Movie();

    expect(getTypeOf(Movie)).toBe('typeof Movie');
    expect(getTypeOf(movie)).toBe('Movie');

    Movie.displayName = 'Film';

    expect(getTypeOf(Movie)).toBe('typeof Film');
    expect(getTypeOf(movie)).toBe('Film');
  });
});
