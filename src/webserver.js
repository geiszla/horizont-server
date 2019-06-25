const bodyParser = require('body-parser');
/** @type {object} chalk */
const chalk = require('chalk');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const graphqlHTTP = require('express-graphql');
const https = require('https');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const { execute } = require('graphql');

const {
  graphQueryLogger: graphQLQueryLogger,
  graphResponseLogger,
  morganGenerator,
  print,
  printError,
  printVerbose,
  setLogLevel,
} = require('./log');

const database = require('./data');
const graphQLSchema = require('./api');

/**
 * @param {{
  *  databaseAddress: string;
  *  logLevel: number;
  *  port: number;
  * }} options
  */
exports.startWebserverAsync = async (options) => {
  const { databaseAddress, logLevel, port } = options;

  const app = await exports.createWebserverAsync(databaseAddress, logLevel);

  // Start HTTP 2 Secure Webserver
  const secureOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.crt')),
    passphrase: 'iManT',
  };

  https.createServer(secureOptions, app).listen(port, () => {
    if (logLevel > 0) {
      const url = chalk.blue(`https://localhost:${port}/\n`);
      print(`Webserver is listening at ${url}`);
    } else if (typeof process.send === 'function') {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
};

/**
 * @param {string} databaseAddress
 * @param {number} logLevel
 */
exports.createWebserverAsync = async (databaseAddress, logLevel = 0) => {
  setLogLevel(logLevel);

  // Connect to MongoDB Database
  if (logLevel > 0) {
    print('Connecting to the database....\n');
  }

  try {
    await database.connectAsync(databaseAddress);
  } catch (_) {
    printError('Couldn\'t connect to the database.');
    process.exit(1);
  }

  if (logLevel > 0) {
    const url = chalk.blue(`mongodb://${databaseAddress}/`);
    print(`Connected to MongoDB server at ${url}`);
  } else if (typeof process.send === 'function') {
    process.send({ type: 'database', data: 'connected' });
  }

  // Create Express application
  const app = express();

  if (logLevel > 0) {
    app.use(morgan(morganGenerator));
  }

  app.use(compression());

  // Additional express middlewares
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(session({
    secret: '98414c22d7e2cf27b3317ca7e19df38e9eb221bd',
    resave: true,
    saveUninitialized: false,
  }));

  app.use((_, res, next) => {
    // @ts-ignore
    res.send = new Proxy(res.send, {
      apply: logLevel > 0 ? graphResponseLogger : undefined,
    });

    next();
  });

  // Add GraphQL express middleware
  app.use('/api', graphqlHTTP(request => ({
    schema: graphQLSchema,
    rootValue: { session: request.session },
    graphiql: !process.argv.includes('production'),
    customExecuteFn: logLevel > 0 ? executionArgs => graphQLQueryLogger(executionArgs, execute)
      : undefined,
    customFormatErrorFn: logLevel > 0 ? (error) => {
      printError(`Error while processing GraphQL request: ${error.message}`);
      printVerbose(error.stack);

      return error;
    } : undefined,
  })));

  return app;
};
