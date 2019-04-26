const chalk = require('chalk');


/* ------------------------------------------ Globals ------------------------------------------- */

const localeOptions = { hour12: false };

const prefixes = Object.freeze({
  error: '❌',
  info: '✏️',
  log: '⚪',
  warn: '⚠️',
  request: '⚡',
});

const statusColors = {
  2: 'green',
  3: 'orange',
};

let workerId;
let isVerbose;


/* ------------------------------------------ Exported ------------------------------------------ */

exports.setWorkerId = (id) => {
  workerId = id;
};
exports.setVerbosity = (verbosity) => {
  isVerbose = verbosity;
};

exports.printVerbose = (...args) => {
  if (isVerbose) {
    outputToConsole('info', ...args);
  }
};

exports.print = (...args) => outputToConsole('log', ...args);
exports.printWarning = (...args) => outputToConsole('warn', ...args);
exports.printError = (...args) => outputToConsole('error', ...args);

exports.morganGenerator = (tokens, ...rest) => {
  const {
    method, url, status, res,
  } = tokens;

  const statusCode = status(...rest);
  const statusText = ` [${chalk.keyword([statusColors[statusCode[0]] || 'red'])(statusCode)}]`;

  const prefix = [
    generatePrefix('request') + statusText,
    method(...rest),
    chalk.yellow(url(...rest)),
  ].join(' ');

  const responseTime = tokens['response-time'](...rest, 'content-length');
  const timeText = chalk.keyword(responseTime < 100 ? 'green' : 'orange')(`${responseTime}ms`);

  const responseSize = res(...rest, 'content-length');
  const sizeText = chalk.keyword(responseTime < 1024 ? 'green' : 'orange')(`${responseSize} bytes`);
  const responseText = `response: { time: ${timeText}, size: ${sizeText} }`;

  let message = responseText;

  if (process.argv.includes('production') || isVerbose) {
    message += [
      '',
      `referrer: ${chalk.blue(tokens.referrer(...rest))}`,
      `address: ${chalk.blue(tokens['remote-addr'](...rest))}`,
      `http: ${chalk.blue(tokens['http-version'](...rest))}`,
      `user agent: ${chalk.blue(tokens['user-agent'](...rest))}`,
    ].join(' | ');
  }

  return `${prefix} | ${message}`;
};


/* ------------------------------------- Locals and helpers ------------------------------------- */

const uriRegex = /[^\s]*:\/\/[^\s]*/g;
function outputToConsole(methodName, ...args) {
  const processedArguments = args.map((argument) => {
    let newArgument = argument;

    if (typeof argument === 'string') {
      let match = uriRegex.exec(argument);

      while (match) {
        newArgument = argument.replace(match, chalk.blue(match));
        match = uriRegex.exec();
      }
    }

    return newArgument;
  });

  console[methodName](generatePrefix(methodName), ...processedArguments);
}

function generatePrefix(methodName) {
  const timeStamp = chalk.cyan.bold(new Date().toLocaleString('en-US', localeOptions));
  const workerPrefix = workerId ? ` [${workerId}]` : '';

  const prefix = `${timeStamp}${workerPrefix} ${prefixes[methodName]} `;

  return prefix;
}
