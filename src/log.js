/** @type {object} chalk */
const chalk = require('chalk');
const { highlight } = require('cli-highlight');


/* ------------------------------------------ Globals ------------------------------------------- */

const localeOptions = Object.freeze({ hour12: false });

const prefixes = Object.freeze({
  error: '❌',
  info: '✏️',
  log: '⚪',
  warn: '⚠️',
  request: '⚡',
});

const statusColors = Object.freeze({
  2: 'green',
  3: 'cyan',
});

/** @type {number} */
let workerId;

/** @type {boolean} */
let isVerbose;


/* ------------------------------------------ Exports ------------------------------------------- */

/** @param {number} id */
exports.setWorkerId = (id) => {
  workerId = id;
};

/** @param {boolean} verbosity */
exports.setVerbosity = (verbosity) => {
  isVerbose = verbosity;
};

/** @param {any[]} args */
exports.printVerbose = (...args) => {
  if (isVerbose) {
    outputToConsole('info', ...args);
  }
};

/** @param {any[]} args */
exports.print = (...args) => outputToConsole('log', ...args);

/** @param {any[]} args */
exports.printWarning = (...args) => outputToConsole('warn', ...args);

/** @param {any[]} args */
exports.printError = (...args) => outputToConsole('error', ...args);

exports.morganGenerator = requestLogGenerator;
exports.graphQueryLogger = graphQueryLogger;
exports.graphResponseLogger = graphResponseLogger;


/* ------------------------------------- Locals and helpers ------------------------------------- */

/**
 * @type {import('morgan').FormatFn}
 */
function requestLogGenerator(tokens, ...requestResponse) {
  const {
    method, url, status, res,
  } = tokens;

  // Build and color each part of the logged message

  // Status
  const statusCode = status(...requestResponse);
  if (!statusCode) {
    return '';
  }
  const statusText = ` [${chalk[statusColors[statusCode[0]] || 'red'](statusCode)}]`;

  const message = [
    generatePrefix('request') + statusText,
    method(...requestResponse),
    chalk.yellow(url(...requestResponse)),
  ].join(' ');

  // Response time
  // @ts-ignore
  const responseTime = parseInt(tokens['response-time'](...requestResponse, 'content-length'), 10);
  const timeColor = responseTime < 100 ? 'mediumseagreen' : 'orange';
  const timeText = chalk.keyword(timeColor)(`${responseTime}ms`);

  // Response size
  // @ts-ignore
  const responseSize = parseInt(res(...requestResponse, 'content-length'), 10);

  let sizeText;
  if (responseSize) {
    const sizeColor = responseSize < 1024 ? 'mediumseagreen' : 'orange';
    sizeText = chalk.keyword(sizeColor)(`${responseSize} bytes`);
  } else {
    sizeText = 'unknown';
  }

  // Append more request metadata to the message
  let metadata = `response: { time: ${timeText}, size: ${sizeText} }`;

  if (process.argv.includes('production') || isVerbose) {
    // Add more information if it's in production mode or verbosity is set
    metadata += [
      '',
      `referrer: ${chalk.blue(tokens.referrer(...requestResponse))}`,
      `address: ${chalk.blue(tokens['remote-addr'](...requestResponse))}`,
      `http: ${chalk.blue(tokens['http-version'](...requestResponse))}`,
      `user agent: ${chalk.blue(tokens['user-agent'](...requestResponse))}`,
    ].join(' | ');
  }

  return `${message} | ${metadata}\n`;
}

/**
 * @param {import('graphql').ExecutionArgs} executionArgs
 * @param {import('graphql').execute} originalExecutor
 * @return {object}
 */
function graphQueryLogger(executionArgs, originalExecutor) {
  const currentDefinition = executionArgs.document.definitions
    // @ts-ignore
    .filter(definition => definition.name.value === executionArgs.operationName)[0];

  if (currentDefinition && executionArgs.contextValue.body.query) {
    const queryString = executionArgs.contextValue.body.query
      .substring(currentDefinition.loc.start, currentDefinition.loc.end);
    const queryGroups = concatenateLines(queryString).match(/(query|mutation) ([^\s]+) (.*)/);

    if (queryGroups) {
      exports.print(`GraphQL API request: ${chalk.blue(queryGroups[1])} ${chalk.yellow(queryGroups[2])} ${highlightJSON(queryGroups[3])}`);
    }
  }

  return originalExecutor(executionArgs);
}

/**
 * @param {Function} target
 * @param {any} thisArg
 * @param {any[]} argumentsList
 */
function graphResponseLogger(target, thisArg, argumentsList) {
  const graphQLResponse = JSON.stringify(JSON.parse(argumentsList[0]), null, 2);

  if (graphQLResponse.length > 150 && graphQLResponse.length < 1024) {
    if (isVerbose) {
      exports.printVerbose(`GraphQL response: ${highlightJSON(graphQLResponse)}`);
    } else {
      exports.print('GraphQL response too long. Run in verbose mode to log all responses.');
    }
  } else if (graphQLResponse.length < 150 || isVerbose) {
    exports.print(`GraphQL response: ${highlightJSON(concatenateLines(graphQLResponse))}`);
  }

  Reflect.apply(target, thisArg, argumentsList);
}

/**
 * @param {string} methodName
 * @param {string[]} args
 */
function outputToConsole(methodName, ...args) {
  let processedArguments = args;

  // Highligh specific parts of the logged message
  if (methodName === 'error') {
    // Make error messages red
    processedArguments = args.map(argument => chalk.red(argument));
  }

  console[methodName](generatePrefix(methodName), ...processedArguments);
}

/**
 * @param {string} methodName
 */
function generatePrefix(methodName) {
  // Build prefix from time, log type and worker ID (if exists)
  const timeStamp = chalk.cyan.bold(new Date().toLocaleString('en-US', localeOptions));
  const workerPrefix = workerId ? ` [${workerId}]` : '';

  return `${timeStamp}${workerPrefix} ${prefixes[methodName]} `;
}

/**
 * @param {string} text
 */
function highlightJSON(text) {
  return highlight(text, { language: 'json', ignoreIllegals: true });
}

/**
 * @param {string} text
 */
function concatenateLines(text) {
  return text.replace(/\s{2,}/g, ' ').replace(/(\r?\n)+/g, ' ');
}
