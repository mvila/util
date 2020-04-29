import {possiblyMany} from './possibly-many';

describe('One or many', () => {
  test('possiblyMany.get()', () => {
    expect(possiblyMany.get('aaa')).toBe('aaa');
    expect(() => possiblyMany.get('aaa', 1)).toThrow(/Expected an array/);

    expect(possiblyMany.get(['aaa', 'bbb'], 1)).toBe('bbb');
    expect(() => possiblyMany.get(['aaa', 'bbb'])).toThrow(/Expected an index/);
  });

  test('possiblyMany.call()', () => {
    let results = [];
    possiblyMany.call('aaa', (value) => {
      results.push(value.toUpperCase());
    });
    expect(results).toEqual(['AAA']);

    results = [];
    possiblyMany.call(['aaa', 'bbb', 'ccc'], (value) => {
      results.push(value.toUpperCase());
    });
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('possiblyMany.map()', () => {
    const result = possiblyMany.map('aaa', (value) => value.toUpperCase());
    expect(result).toBe('AAA');

    const results = possiblyMany.map(['aaa', 'bbb', 'ccc'], (value) => value.toUpperCase());
    expect(results).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('possiblyMany.find()', () => {
    let result = possiblyMany.find('aaa', (value) => value === 'aaa');
    expect(result).toBe('aaa');

    result = possiblyMany.find('zzz', (value) => value === 'aaa');
    expect(result).toBeUndefined();

    result = possiblyMany.find(['aaa', 'bbb', 'ccc'], (value) => value === 'bbb');
    expect(result).toEqual('bbb');

    result = possiblyMany.find(['aaa', 'zzz', 'ccc'], (value) => value === 'bbb');
    expect(result).toBeUndefined();
  });
});
