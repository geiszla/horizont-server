global.Promise = require('bluebird');

/** @type {object} chalk */
const chalk = require('chalk');
const cluster = require('cluster');
const fs = require('fs');
const https = require('https');
const path = require('path');

const { databaseAddress } = require('../appconfig.json');

// Set up error handling before local modules are loaded
require('./error');

const { print, printError, setWorkerId } = require('./log');
const { createWebserverAsync } = require('./webserver');

// Google Cloud App Engine (flexible) CPU core limit
const CPU_COUNT = 8;


/* ----------------------------------------- Clustering ----------------------------------------- */

/**
 * @param {boolean} isProduction
 * @param {number} webserverPort
 */
exports.startWithClusteringAsync = async (isProduction, webserverPort) => {
  const workers = [];

  if (isProduction && cluster.isMaster) {
    // If this is the master, set its id to 0 and spawn workers (only production)
    setWorkerId(0);
    setUpWorkers(workers);
  } else {
    // If this is a worker, or development environment

    // Set worker id to its process id (only production)
    if (process.argv.includes('production')) {
      setWorkerId(cluster.worker.process.pid);
    }

    let logLevel = 0;
    if (!isProduction || (cluster.worker && cluster.worker.id > CPU_COUNT)) {
      logLevel++;

      if (process.argv.includes('verbose')) {
        logLevel++;
      }
    }

    // Start Webserver
    startWebserverAsync(webserverPort, isProduction, logLevel);
  }
};

/* ----------------------------------- Worker Message Handling ---------------------------------- */

let dbConnectionCount = 0;
let webserverInstanceCount = 0;

/**
 * @param {{
 *  type: string;
 *  data: string;
 * }} message
 * @param {number} webserverPort
 */
function handleWorkerMessage(message, webserverPort) {
  if (!message) {
    return;
  }

  const { type, data } = message;

  // Filter PM2 monitoring messages
  if (typeof type === 'string' && type.startsWith('axm:')) {
    return;
  }

  if (type === 'database' && data === 'connected') {
    // Count workers connected to database and log it when all are connected
    dbConnectionCount++;

    if (dbConnectionCount === CPU_COUNT) {
      print(`All workers connected to MongoDB server at mongodb://${databaseAddress}/`);
    }
  } else if (type === 'webserver' && data === 'online') {
    // Count workers connected to the webserver and log it when all are connected
    webserverInstanceCount++;

    if (webserverInstanceCount === CPU_COUNT) {
      print(`Webserver started at https://localhost:${webserverPort}/ - All workers are up.\n`);
    }
  }
}


/* ------------------------------------------- Helpers ------------------------------------------ */

/**
 * @param {number} logLevel
 * @param {boolean} isProduction
 * @param {number} webserverPort
 */
async function startWebserverAsync(webserverPort, isProduction, logLevel) {
  const dbAddress = isProduction ? databaseAddress : 'mongodb://localhost:27017';
  const app = await createWebserverAsync(dbAddress, logLevel);

  // Start HTTP 2 Secure Webserver
  const secureOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.crt')),
    passphrase: 'iManT',
  };

  https.createServer(secureOptions, app).listen(webserverPort, () => {
    if (logLevel > 0) {
      const url = chalk.blue(`https://localhost:${webserverPort}/\n`);
      print(`Webserver is listening at ${url}`);
    } else if (typeof process.send === 'function') {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
}

/**
 * @param {import("cluster").Worker[]} workers
 */
function setUpWorkers(workers) {
  print(`Starting ${CPU_COUNT} workers...`);

  // Create same number of workers as CPU cores available
  for (let i = 0; i < CPU_COUNT; i++) {
    workers.push(cluster.fork());

    workers[i].on('message', handleWorkerMessage);
  }

  // Log it when all workers are online
  cluster.on('online', () => {
    if (workers.every(worker => worker.isConnected())) {
      print('All workers started, starting server...\n');
    }
  });

  // Log it when a worker exits and create a new one in its place
  cluster.on('exit', (worker, code, signal) => {
    printError(`Worker ${worker.process.pid} exited with code ${code}, and signal ${signal}`);

    workers.push(cluster.fork());
    print('Creating new worker:', workers[workers.length - 1].process.pid);

    workers[workers.length - 1].on('message', handleWorkerMessage);
  });
}
