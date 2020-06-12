import ts from 'typescript';
import fs from 'fs';
import path from 'path';

import {throwError} from './util';

export async function compileTS({
  defaultInclude,
  defaultExclude,
  module,
  outDir
}: {
  defaultInclude: string[];
  defaultExclude: string[];
  module: string;
  outDir: string;
}) {
  // Borrowed from:
  // - https://github.com/mobxjs/mobx/blob/master/scripts/build.js
  // - https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#a-minimal-compiler

  const configFile = path.resolve('tsconfig.json');

  if (!fs.existsSync(configFile)) {
    throwError(`Couldn't find the 'tsconfig.json' file (path: '${configFile}')`);
  }

  const configText = fs.readFileSync(configFile, 'utf8');

  const {config: configJSON, error} = ts.parseConfigFileTextToJson(configFile, configText);

  if (error !== undefined) {
    throwError(
      `An error occurred while parsing the JSON of the 'tsconfig.json' file (path: '${configFile}')`
    );
  }

  if (configJSON.include === undefined) {
    configJSON.include = defaultInclude;
  }

  if (configJSON.exclude === undefined) {
    configJSON.exclude = defaultExclude;
  }

  if (configJSON.compilerOptions === undefined) {
    configJSON.compilerOptions = {};
  }

  Object.assign(configJSON.compilerOptions, {module, outDir, noEmitOnError: true});

  const {fileNames, options, errors} = ts.parseJsonConfigFileContent(
    configJSON,
    ts.sys,
    path.dirname(configFile)
  );

  if (errors.length > 0) {
    throwError(
      `An error occurred while parsing the 'tsconfig.json' file (path: '${configFile}'): ${errors[0].messageText}`
    );
  }

  const program = ts.createProgram(fileNames, options);
  const {emitSkipped, diagnostics} = program.emit();

  if (emitSkipped) {
    const messages = diagnostics.map(({file, messageText, start}) => {
      if (file) {
        const {line} = file.getLineAndCharacterOfPosition(start!);
        const message = ts.flattenDiagnosticMessageText(messageText, '\n');

        return `${file.fileName}:${line + 1}: ${message}`;
      } else {
        return ts.flattenDiagnosticMessageText(messageText, '\n');
      }
    });

    throwError(`Failed to compile TypeScript\n\n${messages.join('\n')}`);
  }
}
