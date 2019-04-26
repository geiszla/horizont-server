const localeOptions = { hour12: false };
let workerId;

const prefixes = Object.freeze({
  log: 'Info',
  warn: 'Warning',
  error: 'Error',
});

exports.setWorkerId = (id) => {
  workerId = id;
};

exports.print = (text, object) => outputToConsole(text, 'log', object);
exports.printWarning = (text, object) => outputToConsole(text, 'warn', object);
exports.printError = (text, object) => outputToConsole(text, 'error', object);

function outputToConsole(text, methodName, object) {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  const workerPrefix = workerId ? `[${workerId}]` : '';
  const prefix = `[${timeStamp}]${workerPrefix}[${prefixes[methodName]}]`;

  console[methodName](prefix, text);

  if (object !== undefined) {
    console[methodName](object);
    console.log();
  }
}
