const bluebird = require('bluebird');
/** @type {object} chalk */
const chalk = require('chalk');
const debugAgent = require('@google-cloud/debug-agent');
const kms = require('@google-cloud/kms');
const readFileAsync = bluebird.promisify(require('fs').readFile);

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

    let databaseAddress = 'mongodb://localhost:27017';
    if (IS_PRODUCTION) {
      // debugAgent.start();

      const kmsClient = new kms.KeyManagementServiceClient({ projectId: 'horizont-245015' });
      const keyPath = kmsClient.cryptoKeyPath('horizont-245015', 'global', 'horizont', 'secrets');

      const encryptedContent = await readFileAsync('./appconfig.json.enc');
      const kmsDecryptRequest = {
        name: keyPath,
        ciphertext: encryptedContent.toString('base64'),
      };

      const [decryptedContent] = await kmsClient.decrypt(kmsDecryptRequest);
      const configData = JSON.parse(decryptedContent.plaintext.toString('utf-8'));
      ({ databaseAddress } = configData.databaseAddress);
    } else {
      logLevel = process.argv.includes('--verbose') ? 2 : 1;
    }

    // Start Webserver
    startWebserverAsync(2, databaseAddress);
  }
})();

/* ------------------------------------------ Helpers ------------------------------------------- */

/**
 * @param {number} logLevel
 * @param {string} databaseAddress
 */
async function startWebserverAsync(logLevel, databaseAddress) {
  const app = await createWebserverAsync(databaseAddress, logLevel);

  app.listen(PORT, () => {
    const url = chalk.blue(`https://localhost:${PORT}/\n`);
    print(`Webserver is listening at ${url}`);
  });
}
