const {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { addDiscussionByUrl } = require('./discussions');

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
      type: new GraphQLNonNull(GraphQLBoolean),
      args: {
        url: { type: new GraphQLNonNull(GraphQLString) },
        username: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { url, username }) => new Promise((resolve) => {
        addDiscussionByUrl(url, username, resolve);
      }),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });
