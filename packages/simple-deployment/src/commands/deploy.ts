import {createResource} from '../resources';
import {readConfig} from '../config';

type DeployOptions = {
  directory?: string;
};

export async function deploy(options: DeployOptions = {}) {
  const {directory = process.cwd()} = options;

  const config = await readConfig(directory);
  const resource = createResource(config);
  await resource.deploy();
}
