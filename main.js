const cluster = require('cluster');
const cpuCount = require('physical-cpu-count');
global.Promise = require('bluebird');

// Set up error handling before local modules are loaded
require('./src/error');

const {
  print, printError, setVerbosity, setWorkerId,
} = require('./src/log');
const createServerAsync = require('./src/webserver');


/* -------------------------------------- Global Constants -------------------------------------- */

const webserverPort = 8080;
const databaseAddress = 'localhost:27017';
const isProduction = process.argv[2] === 'production';


/* ----------------------------------------- Clustering ----------------------------------------- */

if (process.argv.includes('verbose')) {
  setVerbosity(true);
}

const workers = [];
if (isProduction && cluster.isMaster) {
  // If this is the master, set its id to 0 and spawn workers (only production)
  setWorkerId(0);
  setUpWorkers();
} else {
  // If this is a worker, or development environment

  // Set worker id to its process id (only production)
  if (process.argv.includes('production')) {
    setWorkerId(cluster.worker.process.pid);
  }

  // Run server setup
  const serverOptions = {
    isLoggingEnabled: !isProduction || (cluster.worker && cluster.worker.id > cpuCount),
    port: webserverPort,
    databaseAddress,
  };

  createServerAsync(serverOptions);
}

function setUpWorkers() {
  print(`Starting ${cpuCount} workers...`);

  // Create same number of workers as CPU cores available
  for (let i = 0; i < cpuCount; i++) {
    workers.push(cluster.fork());

    workers[i].on('message', handleWorkerMessage);
  }

  // Log it when all workers are online
  cluster.on('online', () => {
    if (workers.every(worker => worker.state === 'online')) {
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


/* ----------------------------------- Worker Message Handling ---------------------------------- */

let dbConnectionCount = 0;
let webserverInstanceCount = 0;

function handleWorkerMessage(message) {
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

    if (dbConnectionCount === cpuCount) {
      print(`All workers connected to MongoDB server at mongodb://${databaseAddress}/`);
    }
  } else if (type === 'webserver' && data === 'online') {
    // Count workers connected to the webserver and log it when all are connected
    webserverInstanceCount++;

    if (webserverInstanceCount === cpuCount) {
      print(`Webserver started at https://localhost:${webserverPort}/ - All workers are up.\n`);
    }
  }
}
