#!/usr/bin/env node

import sade from 'sade';

import {build} from './commands';
import {programName, programVersion, logError} from './util';

async function main() {
  const program = sade(programName).version(programVersion);

  program.command('build <src> <dest>', '', {default: true}).action(build);

  await program.parse(process.argv);
}

main().catch((error) => {
  if (error?.displayMessage !== undefined) {
    logError(error.displayMessage);
  } else {
    console.error(error);
  }

  process.exit(1);
});
