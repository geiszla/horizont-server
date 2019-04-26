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
  3: 'cyan',
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

  // Build and color each part of the logged message

  // Status
  const statusCode = status(...rest);
  const statusText = ` [${chalk.keyword([statusColors[statusCode[0]] || 'red'])(statusCode)}]`;

  const message = [
    generatePrefix('request') + statusText,
    method(...rest),
    chalk.yellow(url(...rest)),
  ].join(' ');

  // Response time
  const responseTime = tokens['response-time'](...rest, 'content-length');
  const timeText = chalk.keyword(responseTime < 100 ? 'green' : 'orange')(`${responseTime}ms`);

  // Response size
  const responseSize = res(...rest, 'content-length');
  const sizeText = chalk.keyword(responseTime < 1024 ? 'green' : 'orange')(`${responseSize} bytes`);
  const responseText = `response: { time: ${timeText}, size: ${sizeText} }`;

  // Append more request metadata to the message
  let metadata = responseText;

  if (process.argv.includes('production') || isVerbose) {
    // Add more information if it's in production mode or verbosity is set
    metadata += [
      '',
      `referrer: ${chalk.blue(tokens.referrer(...rest))}`,
      `address: ${chalk.blue(tokens['remote-addr'](...rest))}`,
      `http: ${chalk.blue(tokens['http-version'](...rest))}`,
      `user agent: ${chalk.blue(tokens['user-agent'](...rest))}`,
    ].join(' | ');
  }

  return `${message} | ${metadata}`;
};


/* ------------------------------------- Locals and helpers ------------------------------------- */

const uriRegex = /[^\s]*:\/\/[^\s]*/g;
function outputToConsole(methodName, ...args) {
  // Highligh specific parts of the logged message
  const processedArguments = args.map((argument) => {
    let newArgument = argument;

    if (typeof argument === 'string') {
      // Highlight urls in message text
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
  // Build prefix from time, log type and worker ID (if exists)
  const timeStamp = chalk.cyan.bold(new Date().toLocaleString('en-US', localeOptions));
  const workerPrefix = workerId ? ` [${workerId}]` : '';

  const prefix = `${timeStamp}${workerPrefix} ${prefixes[methodName]} `;

  return prefix;
}
