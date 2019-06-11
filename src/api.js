const {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { composeWithMongoose } = require('graphql-compose-mongoose');

const { Discussion } = require('./database');
const { addDiscussionByUrl, postComment } = require('./app/discussions');


/* ------------------------------------------- Types -------------------------------------------- */

const discussionType = composeWithMongoose(Discussion).getType();


/* ------------------------------------------ Queries ------------------------------------------- */

const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getQueue: {
      type: GraphQLBoolean,
      resolve: () => {},
    },
  },
});


/* ----------------------------------------- Mutations ------------------------------------------ */

const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addDiscussionByUrl: {
      type: discussionType,
      args: {
        url: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { url }) => new Promise((resolve, reject) => {
        addDiscussionByUrl(url, resolve, reject);
      }),
    },
    postComment: {
      type: GraphQLBoolean,
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { text, discussionId }) => new Promise((resolve, reject) => {
        postComment(text, discussionId, resolve, reject);
      }),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });
