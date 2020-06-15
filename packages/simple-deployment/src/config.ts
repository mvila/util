import {join, dirname} from 'path';
import {existsSync} from 'fs';

import {throwError} from './util';

const CONFIG_FILE_NAME_JSON = 'simple-deployment.config.json';
const CONFIG_FILE_NAME_JS = 'simple-deployment.config.js';

export async function readConfig(directory: string) {
  const configFile = findConfig(directory);

  if (configFile === undefined) {
    throwError(`Couldn't find the configuration file (from: '${directory}')`);
  }

  let config = require(configFile);

  if (typeof config === 'function') {
    config = await config();
  }

  config.directory = dirname(configFile);

  return config;
}

function findConfig(directory: string) {
  while (true) {
    let configFile = join(directory, CONFIG_FILE_NAME_JSON);

    if (existsSync(configFile)) {
      return configFile;
    }

    configFile = join(directory, CONFIG_FILE_NAME_JS);

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
