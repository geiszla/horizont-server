/** @type {any} chalk */
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

/** @param {string[]} args */
exports.printVerbose = (...args) => {
  if (isVerbose) {
    outputToConsole('info', ...args);
  }
};

/** @param {string[]} args */
exports.print = (...args) => outputToConsole('log', ...args);

/** @param {string[]} args */
exports.printWarning = (...args) => outputToConsole('warn', ...args);

/** @param {string[]} args */
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
  const timeText = chalk.keyword(responseTime < 100 ? 'green' : 'orange')(`${responseTime}ms`);

  // Response size
  // @ts-ignore
  const responseSize = parseInt(res(...requestResponse, 'content-length'), 10);

  let sizeText;
  if (responseSize) {
    sizeText = chalk.keyword(responseSize < 1024 ? 'green' : 'orange')(`${responseSize} bytes`);
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

  return `${message} | ${metadata}`;
}

/**
 * @param {import('graphql').ValidationContext} context
 * @return {any}
 */
function graphQueryLogger(context) {
  console.log();

  // @ts-ignore
  // eslint-disable-next-line no-underscore-dangle
  const queries = context._ast.definitions;

  queries.forEach((query) => {
    const selectionText = query.selectionSet.selections.map((selection) => {
      const argumentText = selection.arguments.map((argument) => {
        const argumentValue = JSON.stringify(argument.value.value, null, 2);

        return `${argument.name.value}: ${argumentValue}`;
      }).join(', ');

      return `${selection.name.value}(${argumentText})`;
    }).join(', ');

    if (query.operation) {
      const operation = chalk.blue(query.operation);
      const queryBody = highlightJSON(`{ ${selectionText} }`);
      const operationData = `${chalk.yellow(query.name.value)} ${queryBody}`;

      exports.print(`GraphQL API request: ${operation} ${operationData}`);
    }
  });

  return true;
}

/**
 * @param {Function} target
 * @param {any} thisArg
 * @param {ArrayLike<any> | string[]} argumentsList
 */
function graphResponseLogger(target, thisArg, argumentsList) {
  const graphQLResponse = JSON.stringify(JSON.parse(argumentsList[0]));

  if (graphQLResponse.length > 150 && graphQLResponse.length < 1024) {
    if (isVerbose) {
      const logString = highlightJSON(JSON.stringify(JSON.parse(graphQLResponse), null, 2));
      exports.printVerbose(`GraphQL response: ${logString}`);
    } else {
      exports.print('GraphQL response too long. Run in verbose mode to log everything.');
    }
  } else if (graphQLResponse.length < 150 || isVerbose) {
    exports.print(`GraphQL response: ${highlightJSON(graphQLResponse)}`);
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
