const {
  print, printError, printWarning,
} = require('./logging');

// Log unhandled promise rejections
const unhandledPromises = [];
process.on('unhandledRejection', (reason, promise) => {
  /* eslint no-param-reassign: 0 */
  promise.reason = reason;
  unhandledPromises.push(promise);

  /* eslint no-underscore-dangle: 0 */
  printWarning(`Possibly unhandled promise rejection (${promise._bitField}):`, reason);

  if (!reason) {
    console.trace('Unknown error');
  }
});

// Log promise rejections, which were reported as unhandled (above), but then were handled later
process.on('rejectionHandled', (promise) => {
  const index = unhandledPromises.indexOf(promise);
  unhandledPromises.splice(index, 1);

  print(`Rejection handled (${promise._bitField}).`);
});

// Log all unhandled rejections before exiting
process.on('exit', () => {
  if (unhandledPromises.length > 0) {
    const rejections = unhandledPromises.map(promise => promise.reason);
    printWarning('Unhandled rejections before exiting:', rejections);
  }
});

// Log handled promise rejections
global.Promise = new Proxy(global.Promise, {
  get(target, propKey, receiver) {
    const targetValue = Reflect.get(target, propKey, receiver);

    if (typeof targetValue === 'function' && propKey === 'reject') {
      return (...args) => {
        printError(`Handled promise rejection: ${args[0].message}`);

        return targetValue.apply(this, args);
      };
    }

    return targetValue;
  },
});
