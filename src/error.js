const {
  print, printWarning,
} = require('./utilities');

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

process.on('rejectionHandled', (promise) => {
  const index = unhandledPromises.indexOf(promise);
  unhandledPromises.splice(index, 1);

  print(`Rejection handled (${promise._bitField}).`);
});

process.on('exit', () => {
  if (unhandledPromises.length > 0) {
    const rejections = unhandledPromises.map(promise => promise.reason);
    printWarning('Unhandled rejections before exiting:', rejections);
  }
});
