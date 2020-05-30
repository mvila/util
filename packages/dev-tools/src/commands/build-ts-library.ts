import rimraf from 'rimraf';

import {compileTS} from '../ts-compiler';

export async function buildTSLibrary() {
  rimraf.sync('dist');

  const options = {
    defaultInclude: ['src/**/*'],
    defaultExclude: ['src/**/*.test.ts', 'src/**/*.fixture.ts']
  };

  await compileTS({...options, module: 'CommonJS', outDir: 'dist/node-cjs'});

  await compileTS({...options, module: 'ES2015', outDir: 'dist/node-esm'});
}
