const {displayName: programName, version: programVersion} = require('../../package.json');

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
