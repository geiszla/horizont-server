const { expect } = require('chai');
const request = require('supertest');

const { createWebserverAsync } = require('../src/webserver');

const databaseAddress = 'localhost:27017';
let app;

before(async () => {
  app = await createWebserverAsync(false, false, databaseAddress);
});

describe('GraphQL', () => {
  it('returns the specified amount of discussions.', async () => {
    const result = await request(app).post('/api').send({
      query: '{ getDiscussions(topic: "local", count: 2) { title, description, image } }',
    }).expect(200);

    expect(result).to.be.an('object').that.is.not.empty;
  });
});
