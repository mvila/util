import fs from 'fs';
import path from 'path';
import {readJsonSync, outputJsonSync, moveSync} from 'fs-extra';
import hasha from 'hasha';
import baseX from 'base-x';

import {logMessage, throwError} from './util';

const base62 = baseX('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

const IMMUTABLE_EXTENSION = '.immutable';

export function freezeDocumentation(directory: string) {
  const indexFile = path.join(directory, 'index.json');

  if (!fs.existsSync(indexFile)) {
    throwError(`The documentation index file is missing (file: '${indexFile}')`);
  }

  logMessage(`Freezing files in '${path.relative(process.cwd(), directory)}'...`);

  const contents = readJsonSync(indexFile);

  for (const book of contents.books) {
    for (const chapter of book.chapters) {
      const file = path.resolve(directory, chapter.file);
      const relativeFileDirectory = path.dirname(chapter.file);
      const fileDirectory = path.dirname(file);
      const fileName = path.basename(file);
      const fileExtension = path.extname(fileName);
      const fileNameWithoutExtension = fileName.slice(0, -fileExtension.length);

      const hash = generateHashFromFile(file);
      const newFileName =
        fileNameWithoutExtension + '-' + hash + IMMUTABLE_EXTENSION + fileExtension;
      const newFile = path.join(fileDirectory, newFileName);

      moveSync(file, newFile);

      chapter.file = path.join(relativeFileDirectory, newFileName);

      logMessage(`File frozen ('${fileName}' -> '${newFileName}')`);
    }
  }

  outputJsonSync(indexFile, contents, {spaces: 2});

  logMessage(`Files successfully frozen in '${path.relative(process.cwd(), directory)}'`);
}

function generateHashFromFile(file: string) {
  const md5 = hasha.fromFileSync(file, {encoding: 'buffer', algorithm: 'md5'});
  return base62.encode(md5);
}
