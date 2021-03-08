import {join} from 'path';
import rimraf from 'rimraf';
import {readdirSync} from 'fs';
import {existsSync} from 'fs-extra';
import hasha from 'hasha';
import sortBy from 'lodash/sortBy';
import semver from 'semver';

import {compileTS} from '../ts-compiler';
import {loadPackage, savePackage} from '../npm-helpers';
import {logMessage} from '../util';

export async function buildTSLibrary() {
  const directory = process.cwd();
  const distDirectory = join(directory, 'dist');

  const pkg = loadPackage(directory);

  const previousDistChecksum = getDirectoryChecksum(distDirectory);

  rimraf.sync('dist');

  const options = {
    defaultInclude: ['src/**/*'],
    defaultExclude: ['src/**/*.test.ts', 'src/**/*.fixture.ts']
  };

  if (pkg.type === 'module') {
    await compileTS({...options, module: 'ES2020', outDir: 'dist'});
  } else {
    await compileTS({...options, module: 'CommonJS', outDir: 'dist/node-cjs'});
    await compileTS({...options, module: 'ES2015', outDir: 'dist/node-esm'});
  }

  const newDistChecksum = getDirectoryChecksum(distDirectory);

  if (newDistChecksum !== previousDistChecksum) {
    pkg.version = semver.inc(pkg.version, 'patch');
    savePackage(directory, pkg);
    logMessage(`Version of '${pkg.name}' bumped to '${pkg.version}'`);
  }
}

function getDirectoryChecksum(directory: string) {
  let checksum = '';

  const accumulate = (directory: string) => {
    const entries = readdirSync(directory, {withFileTypes: true});
    const sortedEntries = sortBy(entries, 'name');

    for (const entry of sortedEntries) {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        accumulate(entryPath);
      } else {
        checksum += hasha.fromFileSync(entryPath);
      }
    }
  };

  if (existsSync(directory)) {
    accumulate(directory);
  }

  return checksum;
}
