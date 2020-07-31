import path from 'path';

import {buildDocumentation} from '../builder';

export async function build(source: string, destination: string) {
  source = path.resolve(process.cwd(), source);

  if (!source.endsWith('/index.json')) {
    source += '/index.json';
  }

  destination = path.resolve(process.cwd(), destination);

  buildDocumentation(source, destination);

  // const {directory = process.cwd()} = options;

  // console.log(directory);
}
