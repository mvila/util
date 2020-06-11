import {resolve, join, relative, dirname} from 'path';
import {existsSync, readdirSync} from 'fs';
import {readJsonSync, ensureDirSync, removeSync, ensureSymlinkSync} from 'fs-extra';
import fs from 'fs';

const CONFIG_FILE_NAME = '.npm-linker.json';

export function run(directory: string, {packageName}: {packageName?: string} = {}) {
  try {
    if (!isDirectory(directory)) {
      throw Object.assign(new Error("Directory doesn't exist"), {
        displayMessage: `The specified directory ('${directory}') doesn't exist`
      });
    }

    const rootConfigFile = findRootConfigFile(directory);

    if (rootConfigFile === undefined) {
      console.warn('npm-linker: Config file not found');
      return;
    }

    const config = loadConfig(rootConfigFile);
    const rootDirectory = dirname(rootConfigFile);

    let packageNames;
    if (packageName) {
      packageNames = [packageName];
    } else {
      packageNames = loadPackageNames(directory);
    }

    const localPackages = findLocalPackages(config.packages);

    const rootModulesDirectory = join(rootDirectory, 'node_modules');
    const modulesDirectory = join(directory, 'node_modules');
    const relativeDirectory = relative(process.cwd(), directory) || '.';

    ensureDirSync(rootModulesDirectory);
    ensureDirSync(modulesDirectory);

    for (const packageName of packageNames) {
      const localPackage = localPackages[packageName];

      if (localPackage === undefined) {
        continue;
      }

      const rootLinkFile = join(rootModulesDirectory, packageName);
      removeSync(rootLinkFile);
      ensureSymlinkSync(relative(dirname(rootLinkFile), localPackage.directory), rootLinkFile);

      const linkFile = join(modulesDirectory, packageName);
      removeSync(linkFile);
      ensureSymlinkSync(relative(dirname(linkFile), rootLinkFile), linkFile);

      const {
        json: {bin}
      } = localPackage;

      if (typeof bin === 'object') {
        const binDirectory = join(modulesDirectory, '.bin');

        ensureDirSync(binDirectory);

        for (let [executableName, executableFileRelative] of Object.entries(bin)) {
          if (typeof executableFileRelative !== 'string') {
            continue; // TODO: Throw a useful error
          }

          const executableLinkFile = join(binDirectory, executableName);
          removeSync(executableLinkFile);
          const executableFile = join(localPackage.directory, executableFileRelative);
          ensureSymlinkSync(
            relative(dirname(executableLinkFile), executableFile),
            executableLinkFile
          );
        }
      }

      console.log(`${relativeDirectory}: '${packageName}' linked`);
    }
  } catch (error) {
    if (error.displayMessage !== undefined) {
      console.error(`npm-linker: ${error.displayMessage}`);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
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

function loadPackageNames(directory: string) {
  const packageFile = join(directory, 'package.json');

  if (!existsSync(packageFile)) {
    return [];
  }

  const {dependencies = {}, devDependencies = {}} = readJsonSync(packageFile);

  return [...Object.keys(dependencies), ...Object.keys(devDependencies)];
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
  const packageFile = join(directory, 'package.json');

  if (!existsSync(packageFile)) {
    return undefined;
  }

  const json = readJsonSync(packageFile);

  if (json.name === undefined) {
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

function isDirectory(path: string): boolean {
  return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}
