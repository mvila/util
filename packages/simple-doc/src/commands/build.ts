import path from 'path';

import {buildDocumentation} from '../builder';
import {freezeDocumentation} from '../freezer';

export async function build(source: string, destination: string, {freeze = false} = {}) {
  source = path.resolve(process.cwd(), source);
  destination = path.resolve(process.cwd(), destination);

  buildDocumentation(source, destination);

  if (freeze) {
    freezeDocumentation(destination);
  }
}
