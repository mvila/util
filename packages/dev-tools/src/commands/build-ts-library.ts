import rimraf from 'rimraf';

import {compileTS} from '../ts-compiler';

export async function buildTSLibrary() {
  rimraf.sync('dist');
  await compileTS({defaultInclude: ['src/**/*'], module: 'CommonJS', outDir: 'dist/node-cjs'});
  await compileTS({defaultInclude: ['src/**/*'], module: 'ES2015', outDir: 'dist/node-esm'});
}
