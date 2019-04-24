const compression = require('compression');
const express = require('express');
const graphqlHTTP = require('express-graphql');
const fs = require('fs');
const https = require('https');
const path = require('path');

const graphQLSchema = require('./api');
const database = require('./database');
const { print } = require('./utilities');

global.Promise = require('bluebird');

// Run server setup synchronously
main();

async function main() {
  // Connect to MongoDB Database
  const mongoAddress = 'localhost:27017';

  print('Connecting to the database....');
  if (!await database.connect(mongoAddress)) {
    process.exit(1);
  }

  print(`Connected to MongoDB server at mongodb://${mongoAddress}/`);
  console.log();

  // Create Express application
  const app = express();
  app.use(compression());

  // Additional express middlewares
  // app.use(bodyParser.json());
  // app.use(cookieParser());
  // app.use(session({
  //   secret: '98414c22d7e2cf27b3317ca7e19df38e9eb221bd',
  //   resave: true,
  //   saveUninitialized: false
  // }));

  // Add GraphQL express middleware
  app.use(
    '/api',
    (req, _, next) => {
      print(`GraphQL API request: ${req.body ? req.body.operationName : 'GUI'}`);
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
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.crt')),
    passphrase: 'iManT',
  };

  const port = 8080;
  https.createServer(options, app).listen(port);
  print(`HTTPS webserver is listening at https://localhost:${port}/`);

  console.log();
}
