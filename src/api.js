const {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { composeWithMongoose } = require('graphql-compose-mongoose');

const {
  createDiscussionByUrlAsync,
  deleteCommentAsync,
  deleteDiscussionAsync,
  editCommentAsync,
  editDiscussionAsync,
  postCommentAsync,
} = require('./app/discussions');

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
        createDiscussionByUrlAsync(url, resolve, reject);
      }),
    },
    deleteDiscussion: {
      type: GraphQLBoolean,
      args: {
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { shortId }) => new Promise((resolve, reject) => {
        deleteDiscussionAsync(shortId, resolve, reject);
      }),
    },
    editDiscussion: {
      type: GraphQLBoolean,
      args: {
        newTitle: { type: GraphQLString },
        newDescription: { type: GraphQLString },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { newTitle, newDescription, shortId }) => new Promise((resolve, reject) => {
        editDiscussionAsync(newTitle, newDescription, shortId, resolve, reject);
      }),
    },
    postComment: {
      type: GraphQLBoolean,
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { text, discussionId }) => new Promise((resolve, reject) => {
        postCommentAsync(text, discussionId, resolve, reject);
      }),
    },
    deleteComment: {
      type: GraphQLBoolean,
      args: {
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { shortId }) => new Promise((resolve, reject) => {
        deleteCommentAsync(shortId, resolve, reject);
      }),
    },
    editComment: {
      type: GraphQLBoolean,
      args: {
        newText: { type: new GraphQLNonNull(GraphQLString) },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { newText, shortId }) => new Promise((resolve, reject) => {
        editCommentAsync(newText, shortId, resolve, reject);
      }),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });
