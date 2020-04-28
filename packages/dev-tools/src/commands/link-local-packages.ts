import {run as runNPMLinker} from 'npm-linker';

export function linkLocalPackages() {
  runNPMLinker(process.cwd());
}
