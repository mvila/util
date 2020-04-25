import rimraf from 'rimraf';

import {compileTS} from '../ts-compiler';

export async function buildTSLibrary() {
  rimraf.sync('dist');
  await compileTS({module: 'CommonJS', outDir: 'dist/node-cjs'});
  await compileTS({module: 'ES2015', outDir: 'dist/node-esm'});
}
