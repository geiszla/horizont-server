const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const graphqlHTTP = require('express-graphql');
const https = require('https');
const path = require('path');
const session = require('express-session');

const database = require('./database');
const graphQLSchema = require('./api');
const { print } = require('./logging');

module.exports = async (options) => {
  const { isLoggingEnabled, port, databaseAddress } = options;

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
  const secureOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.crt')),
    passphrase: 'iManT',
  };

  https.createServer(secureOptions, app).listen(port, () => {
    if (isLoggingEnabled) {
      print(`Webserver is listening at https://localhost:${port}/\n`);
    } else {
      process.send({ type: 'webserver', data: 'online' });
    }
  });
};
