const _ = require('lodash');

exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify(`Hello, ${_.upperFirst(process.env.name)}!`)
  };
};
