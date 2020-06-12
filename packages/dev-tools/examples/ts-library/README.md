Run from the root of 'examples/ts-library':

```bash
# build
(cd ../.. && npm run build) && node ../../dist/node-cjs/cli.js build:ts-library && node ./dist/node-cjs

# test
(cd ../.. && npm run build) && node ../../dist/node-cjs/cli.js test:ts-library && echo 'All tests passed!'

# publish
(cd ../.. && npm run build) && node ../../dist/node-cjs/cli.js publish:package

# update
(cd ../.. && npm run build) && node ../../dist/node-cjs/cli.js update:dependencies
```
