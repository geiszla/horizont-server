const {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { composeWithMongoose } = require('graphql-compose-mongoose');

const { addDiscussionByUrlAsync, postCommentAsync } = require('./app/discussions');
const { Discussion } = require('./database');


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
        addDiscussionByUrlAsync(resolve, reject, url);
      }),
    },
    postComment: {
      type: GraphQLBoolean,
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { text, discussionId }) => new Promise((resolve, reject) => {
        postCommentAsync(resolve, reject, text, discussionId);
      }),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });
