const {name, displayName, version} = require('../../package.json');

const programName = displayName ?? name;
const programVersion = version;

export {programName, programVersion};

export function logMessage(message: string) {
  console.log(`${programName}: ${message}`);
}

export function logError(message: string) {
  console.error(`${programName}: ${message}`);
}

export function throwError(message: string): never {
  throw Object.assign(new Error('Error'), {
    displayMessage: message
  });
}
