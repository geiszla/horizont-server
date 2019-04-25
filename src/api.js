const {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { addDiscussionByUrl, postComment } = require('./discussions');

// Queries
const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getQueue: {
      type: GraphQLBoolean,
      resolve: () => {},
    },
  },
});

// Mutations
const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addDiscussionByUrl: {
      type: GraphQLBoolean,
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
