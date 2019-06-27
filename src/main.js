require('@google-cloud/debug-agent').start();

/** @type {object} chalk */
const chalk = require('chalk');

const { databaseAddress } = require('../appconfig.json');

const { print } = require('./log');
const { createWebserverAsync } = require('./webserver');
const { startWithClusteringAsync } = require('./cluster');


/* -------------------------------------- Global Constants -------------------------------------- */

const PORT = parseInt(process.env.PORT, 10) || 8080;
const IS_PRODUCTION = process.argv.includes('--production');
const IS_CLUSTERING = false;


/* ------------------------------------------ Startup ------------------------------------------- */

(async () => {
  if (IS_CLUSTERING) {
    startWithClusteringAsync(IS_PRODUCTION, PORT);
  } else {
    let logLevel = 0;
    if (!IS_PRODUCTION) {
      logLevel = process.argv.includes('--verbose') ? 2 : 1;
    }

    // Start Webserver
    startWebserverAsync(2);
  }
})();

/* ------------------------------------------ Helpers ------------------------------------------- */

/**
 * @param {number} logLevel
 */
async function startWebserverAsync(logLevel) {
  const app = await createWebserverAsync(databaseAddress, logLevel);

  app.listen(PORT, () => {
    const url = chalk.blue(`https://localhost:${PORT}/\n`);
    print(`Webserver is listening at ${url}`);
  });
}
