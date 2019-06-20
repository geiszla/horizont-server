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

const {
  graphQueryLogger, morganGenerator, print, printError, graphResponseLogger,
} = require('./log');

const database = require('./data');
const graphQLSchema = require('./api');

/**
 * @param {{
 *  isLoggingEnabled: boolean;
 *  port: number;
 *  databaseAddress: string;
 * }} options
 */
module.exports = async (options) => {
  const { isLoggingEnabled, port, databaseAddress } = options;

  // Connect to MongoDB Database
  if (isLoggingEnabled) {
    print('Connecting to the database....\n');
  }

  try {
    await database.connectAsync(databaseAddress);
  } catch (_) {
    process.exit(1);
  }

  if (isLoggingEnabled) {
    const url = chalk.blue(`mongodb://${databaseAddress}/`);
    print(`Connected to MongoDB server at ${url}`);
  } else {
    process.send({ type: 'database', data: 'connected' });
  }

  // Create Express application
  const app = express();
  app.use(morgan(morganGenerator));
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
      apply: graphResponseLogger,
    });

    next();
  });

  // Add GraphQL express middleware
  app.use('/api', graphqlHTTP(request => (
    {
      schema: graphQLSchema,
      rootValue: { session: request.session },
      graphiql: !process.argv.includes('production'),
      validationRules: [graphQueryLogger],
      customFormatErrorFn: (error) => {
        printError(`GraphQL error: ${error.message}`);
        return false;
      },
    })));

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
    } else {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
};
