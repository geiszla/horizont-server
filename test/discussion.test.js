const { expect } = require('chai');
const request = require('supertest');

// Set up error handling before local modules are loaded
require('../src/error');

const { createWebserverAsync } = require('../src/webserver');
const { testDatabaseAddress } = require('../appconfig.json');

/** @type {import('express').Express} */
let app;

before(async () => {
  const isProduction = process.argv.includes('--production');
  const databaseAddress = isProduction ? testDatabaseAddress : 'mongodb://localhost:27017';

  app = await createWebserverAsync(databaseAddress, 1);
});

describe('Discussions', () => {
  it('Able to add a new discussion by URL', async () => {
    const { url } = await testRequest({
      operationName: 'addDiscussionByUrl',
      parameters: 'url: "https://google.com/"',
      fields: ['title', 'description', 'image', 'url'],
      isMutation: true,
    });

    expect(url).to.equal('https://google.com/');
  });

  it('Able to add discussion by URL without protocol', async () => {
    const { url } = await testRequest({
      operationName: 'addDiscussionByUrl',
      parameters: 'url: "google.com"',
      fields: ['title', 'description', 'image', 'url'],
      isMutation: true,
    });

    expect(url).to.equal('http://google.com/');
  });

  it('Request fails if invalid URL is given', async () => {
    const { message } = await testRequest({
      operationName: 'addDiscussionByUrl',
      parameters: 'url: "127.0.0.1"',
      fields: ['title', 'description', 'image'],
      isMutation: true,
    }, 500);

    expect(message).to.equal('Couldn\'t create new discussion.');
  });

  it('Returns the specified amount of discussions', async () => {
    await testRequest({
      operationName: 'getDiscussions',
      parameters: 'topic: "local", count: 2',
      fields: ['title', 'description', 'image'],
    });
  });

  it('Request fails if no discussion limit parameter (count) is given', async () => {
    const { message } = await testRequest({
      operationName: 'getDiscussions',
      parameters: 'topic: "local"',
      fields: ['title'],
    }, 400);

    expect(message).to.contain('argument "count"').and.contain('not provided');
  });
});

/**
 * @param {{
 *  operationName: string,
 *  parameters: string,
 *  fields?: string[],
 *  isMutation?: boolean,
 * }} queryOptions
 * @param {number} expectedReturn
 * @return {Promise<object>}
 */
async function testRequest(queryOptions, expectedReturn = 200) {
  const {
    operationName,
    parameters: requestParameters,
    fields: queryFields = [],
    isMutation = false,
  } = queryOptions;

  const query = buildQueryString(operationName, requestParameters, queryFields,
    isMutation);
  const requestData = { operationName, query };
  const response = await request(app).post('/api').send(requestData).expect(expectedReturn);

  if (response.status !== 200) {
    return response.body.errors[0];
  }

  const responseData = response.body.data[operationName];

  if (Array.isArray(responseData)) {
    responseData.forEach((document) => {
      expectToHaveOwnProperties(document, queryFields);
    });
  } else {
    expectToHaveOwnProperties(responseData, queryFields);
  }

  return response.body.data[operationName];
}

/**
 * @param {object} object
 * @param {string[]} properties
 */
function expectToHaveOwnProperties(object, properties) {
  expect(Object.keys(object)).to.have.members(properties);
}

/**
 * @param {string} methodName
 * @param {string} parameters
 * @param {string[]} returnProperties
 * @param {boolean} isMutation
 */
function buildQueryString(methodName, parameters, returnProperties, isMutation) {
  return `${isMutation ? 'mutation' : 'query'} ${methodName} {
    ${methodName}(${parameters}) {
      ${returnProperties.join(' ')}
    }
  }`;
}
