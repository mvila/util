#!/usr/bin/env node

import sade from 'sade';
import process from 'process';

import {buildTSLibrary} from './commands/build-ts-library';
import {programName, programVersion, logMessage, logError} from './util';

async function main() {
  const program = sade(programName);

  program
    .version(programVersion)
    .command('build:ts-library')
    .describe('Build a library implemented in TypeScript')
    .action(buildTSLibrary);

  const command: any = program.parse(process.argv, {lazy: true});

  await command.handler(...command.args);

  logMessage(`Command '${command.name}' executed successfully`);
}

main().catch((error) => {
  if (error?.displayMessage !== undefined) {
    logError(error.displayMessage);
  } else {
    console.error(error);
  }

  process.exit(1);
});
