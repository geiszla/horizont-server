global.Promise = require('bluebird');

const bodyParser = require('body-parser');
/** @type {object} chalk */
const chalk = require('chalk');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { Datastore } = require('@google-cloud/datastore');
const express = require('express');
const graphqlHTTP = require('express-graphql');
const morgan = require('morgan');
const session = require('express-session');
const { execute } = require('graphql');

const DatastoreStore = require('@google-cloud/connect-datastore')(session);

// Set up error handling before local modules are loaded
require('./error');

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

const isProduction = process.argv.includes('--production');

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
    print(`Connected to MongoDB server at ${chalk.blue(databaseAddress)}`);
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
    store: isProduction ? new DatastoreStore({ dataset: new Datastore() }) : undefined,
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
    graphiql: true, //! isProduction,
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
