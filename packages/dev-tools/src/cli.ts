#!/usr/bin/env node

import sade from 'sade';
import process from 'process';

import {buildTSLibrary, testTSLibrary} from './commands';
import {programName, programVersion, logMessage, logError} from './util';

async function main() {
  const program = sade(programName).version(programVersion);

  program
    .command('build:ts-library')
    .describe('Build a library implemented in TypeScript')
    .action(buildTSLibrary);

  program
    .command('test:ts-library')
    .describe('Test a library implemented in TypeScript (using Jest and TSJest)')
    .option('--watch', 'Enable watch mode')
    .action(testTSLibrary);

  const command: any = program.parse(process.argv, {lazy: true});

  const exitSilently = await command.handler(...command.args);

  if (!exitSilently) {
    logMessage(`Command '${command.name}' executed successfully`);
  }
}

main().catch((error) => {
  if (error?.displayMessage !== undefined) {
    logError(error.displayMessage);
  } else {
    console.error(error);
  }

  process.exit(1);
});
