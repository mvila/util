#!/usr/bin/env node

import sade from 'sade';

import {deploy} from './commands';
import {programName, programVersion, logError} from './util';

async function main() {
  const program = sade(programName).version(programVersion);

  program.command('deploy', '', {default: true}).action(deploy);

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
