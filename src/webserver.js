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
  setVerbosity,
} = require('./log');

const database = require('./data');
const graphQLSchema = require('./api');

/**
 * @param {{
  *  databaseAddress: string;
  *  isLoggingEnabled: boolean;
  *  isVerbose: boolean;
  *  port: number;
  * }} options
  */
exports.startWebserverAsync = async (options) => {
  const {
    databaseAddress, isLoggingEnabled, isVerbose, port,
  } = options;

  const app = await exports.createWebserverAsync(isLoggingEnabled, isVerbose, databaseAddress);

  // Start HTTP 2 Secure Webserver
  const secureOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.crt')),
    passphrase: 'iManT',
  };

  https.createServer(secureOptions, app).listen(port, () => {
    if (isLoggingEnabled) {
      const url = chalk.blue(`https://localhost:${port}/\n`);
      print(`Webserver is listening at ${url}`);
    } else if (typeof process.send === 'function') {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
};

/**
 * @param {boolean} isLoggingEnabled
 * @param {boolean} isVerbose
 * @param {string} databaseAddress
 */
exports.createWebserverAsync = async (isLoggingEnabled, isVerbose, databaseAddress) => {
  // Connect to MongoDB Database
  if (isLoggingEnabled) {
    print('Connecting to the database....\n');
  }

  if (isVerbose) {
    setVerbosity(true);
  }

  try {
    await database.connectAsync(databaseAddress);
  } catch (_) {
    printError('Couldn\'t connect to the database.');
    process.exit(1);
  }

  if (isLoggingEnabled) {
    const url = chalk.blue(`mongodb://${databaseAddress}/`);
    print(`Connected to MongoDB server at ${url}`);
  } else if (typeof process.send === 'function') {
    process.send({ type: 'database', data: 'connected' });
  }

  // Create Express application
  const app = express();

  if (isLoggingEnabled) {
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
      apply: isLoggingEnabled ? graphResponseLogger : undefined,
    });

    next();
  });

  // Add GraphQL express middleware
  app.use('/api', graphqlHTTP(request => ({
    schema: graphQLSchema,
    rootValue: { session: request.session },
    graphiql: !process.argv.includes('production'),
    customExecuteFn: isLoggingEnabled ? executionArgs => graphQLQueryLogger(executionArgs, execute)
      : undefined,
    customFormatErrorFn: isLoggingEnabled ? (error) => {
      printError(`Error while processing GraphQL request: ${error.message}`);
      printVerbose(error);

      return error;
    } : undefined,
  })));

  return app;
};
