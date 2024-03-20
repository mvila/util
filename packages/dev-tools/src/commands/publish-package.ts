import fetch from 'cross-fetch';
import {execFileSync} from 'child_process';

import {loadPackage} from '../npm-helpers';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export async function publishPackage({access, tag}: {access?: string; tag?: string}) {
  const directory = process.cwd();

  const {name, version, private: isPrivate} = loadPackage(directory);

  if (isPrivate) {
    return;
  }

  if (await packageIsPublished(name, version)) {
    return;
  }

  const args = ['publish', `--registry=${NPM_REGISTRY}`];

  if (access !== undefined) {
    args.push(`--access=${access}`);
  }

  if (tag !== undefined) {
    args.push(`--tag=${tag}`);
  }

  execFileSync('npm', args, {stdio: 'inherit'});
}

async function packageIsPublished(name: string, version: string) {
  const publishedPackage = await getJSON(`${NPM_REGISTRY}/${encodeURIComponent(name)}`);

  return publishedPackage !== undefined && Object.keys(publishedPackage.versions).includes(version);
}

async function getJSON(url: string) {
  const fetchResponse = await fetch(url);

  if (fetchResponse.status === 200) {
    return await fetchResponse.json();
  }

  return undefined;
}
