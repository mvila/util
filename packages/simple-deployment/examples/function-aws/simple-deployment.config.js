module.exports = async () => ({
  type: 'function',
  provider: 'aws',
  domainName: 'simple-deployment-function-aws.mvila.me',
  files: ['./src'],
  main: './src/handler.js',
  includeDependencies: true,
  environment: {
    name: 'you'
  },
  aws: {
    region: 'ap-northeast-1',
    lambda: {
      memorySize: 256,
      timeout: 10
    }
  }
});
