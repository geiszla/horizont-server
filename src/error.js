const {
  print, printVerbose, printWarning,
} = require('./log');


/* ------------------------------------- Promise Rejections ------------------------------------- */

// Log unhandled promise rejections
/** @type {Bluebird[]} */
const unhandledPromises = [];
process.on('unhandledRejection',
  /**
   * @param {Error | any} reason
   * @param {Bluebird} promise
   * */
  (reason, promise) => {
    /* eslint no-param-reassign: 0 */
    promise.reason = reason;
    unhandledPromises.push(promise);

    /* eslint no-underscore-dangle: 0 */
    // @ts-ignore
    printWarning(`Possibly unhandled promise rejection (${promise._bitField}):`, reason.stack);

    if (!reason) {
      console.trace('Unknown error');
    }
  });

// Log promise rejections, which were reported as unhandled (above), but then were handled later
process.on('rejectionHandled', /** @param {Bluebird} promise */ (promise) => {
  const index = unhandledPromises.indexOf(promise);
  unhandledPromises.splice(index, 1);

  // @ts-ignore
  print(`Rejection handled (${promise._bitField}).`);
});

// Log all unhandled rejections before exiting
process.on('exit', () => {
  if (unhandledPromises.length > 0) {
    printWarning('Unhandled rejections before exiting:');

    unhandledPromises.map(promise => promise.reason.toString())
      .forEach(reason => printWarning(reason));
  }
});

// Log handled promise rejections
global.Promise = new Proxy(global.Promise, {
  get(target, propertyName, receiver) {
    const targetValue = Reflect.get(target, propertyName, receiver);

    if (typeof targetValue === 'function' && propertyName === 'reject') {
      return (...args) => {
        printVerbose('Handled promise rejection:', args[0].message);

        return targetValue.apply(this, args);
      };
    }

    return targetValue;
  },
});


/* ------------------------------------------- Errors ------------------------------------------- */

// Log all errors (only in verbose mode)
global.Error = new Proxy(global.Error, {
  construct(Target, args) {
    printVerbose('Caught Error:', args[0]);

    return new Target(...args);
  },
});
