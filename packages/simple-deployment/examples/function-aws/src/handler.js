const _ = require('lodash');

exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    body:
      JSON.stringify(
        {
          event,
          result: `Hello, ${_.upperFirst(process.env.name)}!`
        },
        undefined,
        2
      ) + '\n'
  };
};
