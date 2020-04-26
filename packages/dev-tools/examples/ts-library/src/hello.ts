import upperFirst from 'lodash/upperFirst';

export function hello(who: string = 'World') {
  return `Hello, ${upperFirst(who)}!`;
}
