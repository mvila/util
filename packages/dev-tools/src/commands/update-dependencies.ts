import {join} from 'path';
import {execFileSync} from 'child_process';
import semver from 'semver';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import {loadPackage, savePackage, parseVersionSpecifier} from '../npm-helpers';
import {logMessage} from '../util';

export function updateDependencies() {
  const directory = process.cwd();
  const currentPackage = loadPackage(directory);

  execFileSync('npm', ['update', '--dev'], {stdio: 'inherit'});
  updatePackageWithActualDependencyVersions(directory);

  const updatedPackage = loadPackage(directory);

  if (!isEqual(currentPackage, updatedPackage)) {
    updatedPackage.version = semver.inc(currentPackage.version, 'patch');
    savePackage(directory, updatedPackage);
    logMessage(`Version of '${currentPackage.name}' bumped to '${updatedPackage.version}'`);
  }
}

function updatePackageWithActualDependencyVersions(directory: string) {
  const currentPackage = loadPackage(directory);
  const updatedPackage = cloneDeep(currentPackage);

  const update = (dependencyType: string) => {
    if (currentPackage[dependencyType] === undefined) {
      return;
    }

    for (const [dependencyName, dependencyVersionSpecifier] of Object.entries<string>(
      currentPackage[dependencyType]
    )) {
      const parsedVersionSpecifier = parseVersionSpecifier(dependencyVersionSpecifier);

      if (parsedVersionSpecifier === undefined) {
        continue;
      }

      const {operator, version} = parsedVersionSpecifier;

      const dependencyDirectory = join(directory, 'node_modules', dependencyName);
      const dependencyPackage = loadPackage(dependencyDirectory);

      if (dependencyPackage.version === version) {
        continue;
      }

      updatedPackage[dependencyType][dependencyName] = `${operator}${dependencyPackage.version}`;
      logMessage(
        `Version of dependency '${dependencyName}' corrected to '${dependencyPackage.version}' in package '${currentPackage.name}'`
      );
    }
  };

  update('dependencies');
  update('devDependencies');

  if (!isEqual(currentPackage, updatedPackage)) {
    savePackage(directory, updatedPackage);
  }
}
