#!/usr/bin/env node

import sade from 'sade';

import {buildTSLibrary, testTSLibrary, publishPackage, updateDependencies} from './commands';
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
    .option(
      '--all',
      'Force Jest to run all tests instead of running only tests related to changed files'
    )
    .option('--cache', 'Whether to use the transform cache')
    .option('--clearCache', 'Clears the configured Jest cache directory and then exits')
    .option('--notify', 'Activates notifications for test results')
    .option('--verbose', 'Display individual test results with the test suite hierarchy')
    .option('--watch', 'Watch files for changes and rerun tests related to changed files')
    .action(testTSLibrary);

  program
    .command('publish:package')
    .describe('Publish a package to NPM if the current version differs from the published one')
    .option(
      '--access',
      'Tells the registry whether the package should be published as public or restricted'
    )
    .action(publishPackage);

  program
    .command('update:dependencies')
    .describe('Update the dependencies of an NPM package')
    .action(updateDependencies);

  const command: any = program.parse(process.argv, {lazy: true});

  if (command !== undefined) {
    const exitSilently = await command.handler(...command.args);

    if (!exitSilently) {
      logMessage(`Command '${command.name}' executed successfully`);
    }
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
