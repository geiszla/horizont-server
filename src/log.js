const localeOptions = { hour12: false };
let workerId;
let isVerbose;

const prefixes = Object.freeze({
  error: 'Error',
  info: 'Verbose',
  log: 'Info',
  warn: 'Warning',
});

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


function outputToConsole(methodName, ...args) {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  const workerPrefix = workerId ? `[${workerId}]` : '';
  const prefix = `[${timeStamp}]${workerPrefix}[${prefixes[methodName]}]`;

  console[methodName](prefix, ...args);
}
