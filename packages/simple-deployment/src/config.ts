import {join, dirname} from 'path';
import {existsSync} from 'fs';
import {readJsonSync} from 'fs-extra';

import {throwError} from './util';

const CONFIG_FILE_NAME = 'simple-deployment.json';

export function readConfig(directory: string) {
  const configFile = findConfig(directory);

  if (configFile === undefined) {
    throwError(`Couldn't find the configuration file (from: '${directory}')`);
  }

  const config = readJsonSync(configFile);

  config.directory = dirname(configFile);

  return config;
}

function findConfig(directory: string) {
  while (true) {
    const configFile = join(directory, CONFIG_FILE_NAME);

    if (existsSync(configFile)) {
      return configFile;
    }

    const parentDirectory = join(directory, '..');

    if (parentDirectory === directory) {
      break;
    }

    directory = parentDirectory;
  }

  return undefined;
}
