const localeOptions = { hour12: false };
let workerId;

const prefixes = {
  log: 'Info',
  warn: 'Warning',
  error: 'Error',
};

exports.setWorkerId = (id) => {
  workerId = id;
};

exports.print = (text, isVerboseLogging) => outputToConsole(text, 'log', isVerboseLogging);
exports.printWarning = (text, isVerboseLogging) => outputToConsole(text, 'warn', isVerboseLogging);
exports.printError = (text, isVerboseLogging) => outputToConsole(text, 'error', isVerboseLogging);

function outputToConsole(text, methodName) {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  const workerPrefix = workerId ? `[${workerId}]` : '';
  const prefix = `[${timeStamp}]${workerPrefix}[${prefixes[methodName]}]`;

  console[methodName](prefix, text);
}
