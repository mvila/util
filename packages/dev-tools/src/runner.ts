import {buildTSLibrary} from './commands/build-ts-library';

const commands: {[key: string]: Function} = {
  'build:ts-library': buildTSLibrary
};

export async function run(commandName: string, args: string[], options: {[key: string]: string}) {
  const command = commands[commandName];

  if (command === undefined) {
    throw Object.assign(new Error('Command not found'), {
      displayMessage: `The specified command ('${commandName}') is not recognized`
    });
  }

  await command(args, options);
}
