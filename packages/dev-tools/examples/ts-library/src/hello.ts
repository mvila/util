import upperFirst from 'lodash/upperFirst';

export function hello(who: string = 'world') {
  return `Hello, ${upperFirst(who)}!`;
}
