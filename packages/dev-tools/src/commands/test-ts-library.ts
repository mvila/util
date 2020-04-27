import {run as runJest} from 'jest';

export async function testTSLibrary({watch = false}: {watch: boolean}) {
  // Partially borrowed from:
  // - https://github.com/jaredpalmer/tsdx/blob/master/src/index.ts
  // - https://github.com/jaredpalmer/tsdx/blob/master/src/createJestConfig.ts

  const rootDir = 'src';

  const config = {
    rootDir,
    testMatch: ['<rootDir>/**/*.(spec|test).{ts,tsx,js,jsx}'],
    transform: {'.(ts|tsx)$': require.resolve('ts-jest/dist')},
    transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    watchPlugins: [
      require.resolve('jest-watch-typeahead/filename'),
      require.resolve('jest-watch-typeahead/testname')
    ]
  };

  const args = ['--config', JSON.stringify(config)];

  if (watch) {
    args.push('--watch');
  }

  await runJest(args);

  return true;
}
