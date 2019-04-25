const bodyParser = require('body-parser');
const cluster = require('cluster');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cpuCount = require('physical-cpu-count');
const express = require('express');
const fs = require('fs');
const graphqlHTTP = require('express-graphql');
const https = require('https');
const path = require('path');
const session = require('express-session');
global.Promise = require('bluebird');

const database = require('./src/database');
const graphQLSchema = require('./src/api');
const { print, printError, setWorkerId } = require('./src/utilities');


/* -------------------------------------- Global Constants -------------------------------------- */

const webserverPort = 8080;
const databaseAddress = 'localhost:27017';
const isProduction = process.argv[2] === 'production';


/* ----------------------------------------- Clustering ----------------------------------------- */

const workers = [];
if (isProduction && cluster.isMaster) {
  setWorkerId(0);
  setUpWorkers();
} else {
  if (process.argv[2] === 'production') {
    setWorkerId(cluster.worker.process.pid);
  }

  // Run server setup
  main(cluster.worker && cluster.worker.id > cpuCount);
}

function setUpWorkers() {
  // Create same number of workers as CPU cores available
  print(`Starting ${cpuCount} workers...`);

  for (let i = 0; i < cpuCount; i++) {
    workers.push(cluster.fork());

    workers[i].on('message', handleWorkerMessage);
  }

  // Log on worker start
  cluster.on('online', () => {
    if (workers.every(worker => worker.state === 'online')) {
      print('All workers started, starting server...\n');
    }
  });

  // Create new workers and log it when one exits
  cluster.on('exit', (worker, code, signal) => {
    printError(`Worker ${worker.process.pid} exited with code ${code}, and signal ${signal}`);

    workers.push(cluster.fork());
    print(`Creating new worker: ${workers[workers.length - 1].process.pid}`);

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
    dbConnectionCount++;

    if (dbConnectionCount === cpuCount) {
      print(`All workers connected to MongoDB server at mongodb://${databaseAddress}/`);
    }
  } else if (type === 'webserver' && data === 'online') {
    webserverInstanceCount++;

    if (webserverInstanceCount === cpuCount) {
      print(`Webserver started at https://localhost:${webserverPort}/ - All workers are up.\n`);
    }
  }
}


/* ------------------------------------------ Webserver ----------------------------------------- */

async function main(isForceLogging) {
  const isLoggingEnabled = !isProduction || isForceLogging;

  // Connect to MongoDB Database
  if (isLoggingEnabled) {
    print('Connecting to the database....\n');
  }
  if (!await database.connect(databaseAddress)) {
    process.exit(1);
  }

  if (isLoggingEnabled) {
    print(`Connected to MongoDB server at mongodb://${databaseAddress}/`);
  } else {
    process.send({ type: 'database', data: 'connected' });
  }

  // Create Express application
  const app = express();
  app.use(compression());

  // Additional express middlewares
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(session({
    secret: '98414c22d7e2cf27b3317ca7e19df38e9eb221bd',
    resave: true,
    saveUninitialized: false,
  }));

  // Add GraphQL express middleware
  app.use(
    '/api',
    (req, _, next) => {
      print(`GraphQL API request: ${req.body.operationName || '[GET GraphiQL]'}`);
      next();
    },
    graphqlHTTP(req => ({
      schema: graphQLSchema,
      rootValue: { session: req.session },
      graphiql: true,
    })),
  );

  // Start HTTP 2 Secure Webserver
  const options = {
    key: fs.readFileSync(path.join(__dirname, './ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, './ssl/cert.crt')),
    passphrase: 'iManT',
  };

  https.createServer(options, app).listen(webserverPort, () => {
    if (isLoggingEnabled) {
      print(`Webserver is listening at https://localhost:${webserverPort}/\n`);
    } else {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
}
