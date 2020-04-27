#!/usr/bin/env node

import {resolve} from 'path';
import minimist from 'minimist';

import {run} from './npm-linker';

const argv = minimist(process.argv);

const directory = resolve(process.cwd(), argv._[2] || './');
const packageName = argv._[3];

run(directory, {packageName});
