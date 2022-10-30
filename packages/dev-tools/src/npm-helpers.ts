import {existsSync} from 'fs';
import {join} from 'path';
import {readJsonSync, writeJsonSync} from 'fs-extra';
import {execFileSync} from 'child_process';

import {logMessage, throwError} from './util';

export function loadPackage(directory: string) {
  const packageFile = join(directory, 'package.json');

  if (!existsSync(packageFile)) {
    throwError(
      `Expected a 'package.json' file in the directory '${directory}', but the file is missing`
    );
  }

  const json = readJsonSync(packageFile);

  if (!(json?.name !== undefined && json?.version !== undefined)) {
    throwError(`The 'package.json' file in the directory '${directory}' is invalid`);
  }

  return json;
}

export function savePackage(directory: string, packageJSON: object) {
  const packageFile = join(directory, 'package.json');
  writeJsonSync(packageFile, packageJSON, {spaces: 2});
}

export function bumpPackageVersion(directory: string) {
  execFileSync('npm', ['version', '--no-git-tag-version', 'patch'], {
    cwd: directory,
    stdio: 'inherit'
  });

  const bumpedPackage = loadPackage(directory);

  logMessage(`Version of '${bumpedPackage.name}' bumped to '${bumpedPackage.version}'`);
}

export function parseVersionSpecifier(version: string) {
  if (!(version.startsWith('^') || version.startsWith('~'))) {
    return undefined;
  }

  return {operator: version.slice(0, 1), version: version.slice(1)};
}
