let chalk = require('chalk');
const { highlight } = require('cli-highlight');

// Limit colors, so we can use keyword the same as default colors
chalk = new chalk.constructor({ level: 1 });

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

exports.morganGenerator = requestLogGenerator;
exports.graphQueryLogger = graphQueryLogger;
exports.graphResponseLogger = graphResponseLogger;

/* ------------------------------------- Locals and helpers ------------------------------------- */

function requestLogGenerator(tokens, ...rest) {
  const {
    method, url, status, res,
  } = tokens;

  // Build and color each part of the logged message

  // Status
  const statusCode = status(...rest);
  const statusText = ` [${chalk[[statusColors[statusCode[0]] || 'red']](statusCode)}]`;

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
      `referrer: ${chalk.blue(tokens.referrer(...rest))}`,
      `address: ${chalk.blue(tokens['remote-addr'](...rest))}`,
      `http: ${chalk.blue(tokens['http-version'](...rest))}`,
      `user agent: ${chalk.blue(tokens['user-agent'](...rest))}`,
    ].join(' | ');
  }

  return `${message} | ${metadata}`;
}

function graphQueryLogger(context) {
  /* eslint no-underscore-dangle: 0 */
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
      const operationData = `${chalk.yellow(query.name.value)} { ${selectionText} }`;

      exports.print(`GraphQL API request: ${operation} ${operationData}`);
    }
  });

  return true;
}

function graphResponseLogger(target, thisArg, argumentsList) {
  const graphQLResponse = JSON.stringify(JSON.parse(argumentsList[0]));

  if (graphQLResponse.length > 300) {
    if (!isVerbose) {
      exports.print('GraphQL response too long. Run in verbose mode to log everything.');
    } else {
      const logString = highlightJSON(JSON.stringify(JSON.parse(graphQLResponse), null, 2));
      exports.printVerbose(`GrphQL response: ${logString}`);
    }
  } else {
    exports.print(`GraphQL response: ${highlightJSON(highlightJSON(graphQLResponse))}`);
  }

  Reflect.apply(target, thisArg, argumentsList);
}

function outputToConsole(methodName, ...args) {
  let processedArguments = args;

  // Highligh specific parts of the logged message
  if (methodName === 'error') {
    processedArguments = args.map(argument => chalk.red(argument));
  }

  console[methodName](generatePrefix(methodName), ...processedArguments);
}

function generatePrefix(methodName) {
  // Build prefix from time, log type and worker ID (if exists)
  const timeStamp = chalk.cyan.bold(new Date().toLocaleString('en-US', localeOptions));
  const workerPrefix = workerId ? ` [${workerId}]` : '';

  return `${timeStamp}${workerPrefix} ${prefixes[methodName]} `;
}

function highlightJSON(text) {
  return highlight(text, { language: 'json', ignoreIllegals: true });
}
