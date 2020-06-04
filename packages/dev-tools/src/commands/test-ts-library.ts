import {run as runJest} from 'jest';

export async function testTSLibrary({
  all = false,
  cache = true,
  clearCache = false,
  notify = false,
  verbose = false,
  watch = false
}) {
  // Partially borrowed from:
  // - https://github.com/jaredpalmer/tsdx/blob/master/src/index.ts
  // - https://github.com/jaredpalmer/tsdx/blob/master/src/createJestConfig.ts

  const rootDir = 'src';

  const babelConfig = {
    presets: [[require.resolve('@babel/preset-env'), {targets: {node: '10'}, loose: true}]],
    plugins: [
      [require.resolve('@babel/plugin-proposal-decorators'), {legacy: true}],
      [require.resolve('@babel/plugin-proposal-class-properties'), {loose: true}]
    ]
  };

  const jestConfig = {
    rootDir,
    testMatch: ['<rootDir>/**/*.(spec|test).{ts,tsx,js,jsx}'],
    transform: {
      '.(ts|tsx)$': require.resolve('ts-jest/dist'),
      '.(js|jsx)$': [require.resolve('babel-jest'), babelConfig]
    },
    transformIgnorePatterns: ['[/\\\\](node_modules|dist)[/\\\\].+\\.js$'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    watchPlugins: [
      require.resolve('jest-watch-typeahead/filename'),
      require.resolve('jest-watch-typeahead/testname')
    ]
  };

  const args = ['--config', JSON.stringify(jestConfig)];

  if (all) {
    args.push('--all');
  }

  if (!cache) {
    args.push('--no-cache');
  }

  if (clearCache) {
    args.push('--clearCache');
  }

  if (notify) {
    args.push('--notify');
  }

  if (verbose) {
    args.push('--verbose');
  }

  if (watch) {
    args.push('--watch');
  }

  await runJest(args);

  return true;
}
