import Koa from 'koa';
import logger from 'koa-logger';
import proxy from 'koa-proxies';
import tar from 'tar';
import {resolve, join, dirname} from 'path';
import {existsSync, readdirSync, lstatSync} from 'fs';
import {readJsonSync} from 'fs-extra';
import getStream from 'get-stream';
import hasha from 'hasha';

const CONFIG_FILE_NAME = '.npm-dev-registry.json';
const PORT = 3333;
const NPM_REGISTRY = 'https://registry.npmjs.org';

(async () => {
  const config = loadRootConfig(process.cwd());

  if (config === undefined) {
    throw new Error('Config file not found');
  }

  const localPackages = findLocalPackages(config.packages);

  const koa = new Koa();

  koa.use(
    logger((message) => {
      console.log(message);
    })
  );

  koa.use(async function (ctx, next) {
    if (ctx.method === 'GET') {
      const {name, tarballURL} = parseURL(ctx.url);

      const localPackage = localPackages[name];

      if (localPackage !== undefined) {
        await refreshLocalPackage(localPackage, {includeTarball: true});

        if (tarballURL !== undefined) {
          ctx.body = localPackage.tarball;

          return;
        }

        const version = localPackage.json.version;

        ctx.body = {
          name,
          'dist-tags': {latest: version},
          'versions': {
            [version]: {
              ...localPackage.json,
              dist: {
                tarball: `http://localhost:${PORT}/${name}/-/package-${version}.tgz`
              }
            }
          }
        };

        return;
      }

      // OPTIMIZATION: Redirecting is faster than proxying
      ctx.redirect(`${NPM_REGISTRY}/${ctx.request.url}`);

      return;
    }

    await next();
  });

  koa.use(proxy('/', {target: NPM_REGISTRY, changeOrigin: true, logs: true}));

  koa.listen(PORT, () => {
    console.log(`Server started (port: ${PORT})`);
  });
})().catch((err) => {
  if (err.displayMessage !== undefined) {
    console.error(err.displayMessage);
  } else {
    throw err;
  }
});

function parseURL(url: string) {
  let str = decodeURIComponent(url);

  if (str[0] !== '/') {
    throw new Error(`Expected a '/' at the beginning of the URL`);
  }

  str = str.slice(1);

  let index = 0;

  if (str[0] === '@') {
    let index = str.indexOf('/');

    if (index === -1) {
      throw new Error(`The URL '${url}' is invalid`);
    }
  }

  index = str.indexOf('/-/', index);

  if (index === -1) {
    // @scope/package
    return {name: str};
  }

  // @scope/package/-/package-x.x.x.tgz
  const name = str.slice(0, index);
  const tarballURL = str.slice(index + '/-/'.length);

  return {name, tarballURL};
}

function loadRootConfig(currentDirectory: string) {
  const rootConfigFile = findRootConfigFile(currentDirectory);

  if (rootConfigFile === undefined) {
    return;
  }

  return loadConfig(rootConfigFile);
}

function loadConfig(configFile: string) {
  const mergedConfig: {packages: string[]} = {packages: []};

  const configDirectory = dirname(configFile);

  const config = readJsonSync(configFile);

  const {packages = [], include = []} = config;

  for (const pkg of packages) {
    const resolvedPackage = resolve(configDirectory, pkg);

    if (!mergedConfig.packages.includes(resolvedPackage)) {
      mergedConfig.packages.push(resolvedPackage);
    }
  }

  for (const includedConfigDirectory of include) {
    const resolvedIncludedConfigDirectory = resolve(configDirectory, includedConfigDirectory);
    const includedConfigFile = join(resolvedIncludedConfigDirectory, CONFIG_FILE_NAME);

    if (!existsSync(includedConfigFile)) {
      throw Object.assign(new Error("Config file doesn't exist"), {
        displayMessage: `Configuration file '${includedConfigFile}' doesn't exist (included in '${configFile}')`
      });
    }

    const includedConfig = loadConfig(includedConfigFile);

    for (const includedPackage of includedConfig.packages) {
      if (!mergedConfig.packages.includes(includedPackage)) {
        mergedConfig.packages.push(includedPackage);
      }
    }
  }

  return mergedConfig;
}

function findRootConfigFile(currentDirectory: string) {
  let rootConfigFile;

  while (true) {
    const configFile = join(currentDirectory, CONFIG_FILE_NAME);

    if (existsSync(configFile)) {
      rootConfigFile = configFile;
    }

    const parentDirectory = join(currentDirectory, '..');

    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return rootConfigFile;
}

function findLocalPackages(packages: string[]) {
  const localPackages = Object.create(null);

  for (const localPackage of packages) {
    if (localPackage.includes('*')) {
      if (localPackage.slice(-2) === '/*') {
        const parentDirectory = localPackage.slice(0, -2);

        if (!isDirectory(parentDirectory)) {
          throw Object.assign(new Error('Invalid package specifier'), {
            displayMessage: `The configuration contains a package specifier that does not match an existing directory (${localPackage})`
          });
        }

        Object.assign(localPackages, findLocalPackageFromParentDirectory(parentDirectory));
      } else {
        throw Object.assign(new Error('Invalid package specifier'), {
          displayMessage: `The configuration contains an invalid package specifier (${localPackage})`
        });
      }
    } else {
      const directory = localPackage;

      if (!isDirectory(directory)) {
        throw Object.assign(new Error('Invalid package specifier'), {
          displayMessage: `The configuration contains a package specifier that does not match an existing directory (${localPackage})`
        });
      }

      Object.assign(localPackages, findLocalPackageFromDirectory(directory));
    }
  }

  return localPackages;
}

function findLocalPackageFromDirectory(directory: string) {
  const json = loadPackageFromDirectory(directory);

  if (json === undefined) {
    return undefined;
  }

  return {[json.name]: {directory, json}};
}

function findLocalPackageFromParentDirectory(parentDirectory: string) {
  const localPackages = Object.create(null);

  const entries = readdirSync(parentDirectory);

  for (let entry of entries) {
    entry = join(parentDirectory, entry);

    if (!isDirectory(entry)) {
      continue;
    }

    const directory = entry;

    Object.assign(localPackages, findLocalPackageFromDirectory(directory));
  }

  return localPackages;
}

async function refreshLocalPackage(
  localPackage: {directory: string; tarball: Buffer; integrity: string; json: any},
  {includeTarball = false, includeIntegrity = false} = {}
) {
  const json = loadPackageFromDirectory(localPackage.directory);

  if (json === undefined) {
    throw new Error(`Local package not found (directory: '${localPackage.directory}')`);
  }

  const versionChanged = json.version !== localPackage.json.version;

  if (versionChanged) {
    localPackage.json = json;
  }

  if (includeTarball && (versionChanged || localPackage.tarball === undefined)) {
    localPackage.tarball = await createTarball(localPackage.directory);

    if (includeIntegrity && (versionChanged || localPackage.integrity === undefined)) {
      localPackage.integrity = await computeIntegrity(localPackage.tarball);
    }
  }
}

function loadPackageFromDirectory(directory: string) {
  const packageFile = join(directory, 'package.json');

  if (!existsSync(packageFile)) {
    return undefined;
  }

  const json = readJsonSync(packageFile);

  if (!(json?.name !== undefined && json?.version !== undefined)) {
    return undefined;
  }

  return json;
}

async function createTarball(directory: string) {
  const packageFile = join(directory, 'package.json');

  const {files} = readJsonSync(packageFile);

  if (files === undefined) {
    throw new Error('package.files is missing');
  }

  if (!files.includes('package.json')) {
    files.push('package.json');
  }

  const stream = await tar.create({cwd: directory, prefix: 'package', gzip: true}, files);
  const tarball = await getStream.buffer(stream);

  return tarball;
}

async function computeIntegrity(tarball: Buffer) {
  const sha512 = await hasha.async(tarball, {algorithm: 'sha512', encoding: 'base64'});

  return `sha512-${sha512}`;
}

function isDirectory(path: string): boolean {
  return existsSync(path) && lstatSync(path).isDirectory();
}
