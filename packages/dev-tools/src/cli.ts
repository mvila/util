#!/usr/bin/env node

import minimist from 'minimist';
import process from 'process';

import {run} from './runner';

async function main() {
  const commandName = process.argv[2];

  if (commandName === undefined) {
    throw Object.assign(new Error('Command is missing'), {
      displayMessage: 'Please specify a command (e.g., `dev-tools build:ts-library`)'
    });
  }

  const {_: args, ...options} = minimist(process.argv.slice(3));

  await run(commandName, args, options);

  console.log(`dev-tools: Command '${commandName}' executed`);
}

main().catch(error => {
  if (error.displayMessage !== undefined) {
    console.error(`dev-tools: ${error.displayMessage}`);
    process.exit(1);
  }

  throw error;
});
