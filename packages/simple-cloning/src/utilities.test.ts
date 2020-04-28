import {isLeaf} from './utilities';

describe('Utilities', () => {
  test('isLeaf()', async () => {
    expect(isLeaf(undefined)).toBe(true);
    expect(isLeaf(null)).toBe(true);

    expect(isLeaf(true)).toBe(true);

    expect(isLeaf(123.45)).toBe(true);
    expect(isLeaf(0 / 0)).toBe(true);

    expect(isLeaf('Hello')).toBe(true);

    expect(isLeaf(new Date('2020-01-25T08:40:53.407Z'))).toBe(true);
    expect(isLeaf(new Date('invalid'))).toBe(true);

    expect(isLeaf(/.*/)).toBe(true);

    expect(isLeaf(new Error('Message'))).toBe(true);

    expect(isLeaf({title: 'Inception', country: undefined, duration: 120})).toBe(false);

    expect(isLeaf([1, 2, undefined, 3])).toBe(false);
  });
});
