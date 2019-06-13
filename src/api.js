const {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql');

const { composeWithMongoose } = require('graphql-compose-mongoose/node8');

const {
  agreeOrDisagreeAsync,
  createDiscussionByUrlAsync,
  deleteCommentAsync,
  deleteDiscussionAsync,
  editCommentAsync,
  editDiscussionAsync,
  postCommentAsync,
} = require('./mutations/discussion');
const {
  getCommentsAsync,
  getDiscussionsAsync,
} = require('./queries/discussion');

const { Discussion } = require('./data');


/* ------------------------------------------- Types -------------------------------------------- */

const discussionTypeComposer = composeWithMongoose(Discussion);
const discussionType = discussionTypeComposer.getType();
const commentListType = discussionTypeComposer.get('comments').getType();


/* ------------------------------------------ Queries ------------------------------------------- */

const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getDiscussions: {
      type: new GraphQLList(discussionType),
      args: {
        topic: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (_, { topic, count }) => new Promise((resolve, reject) => {
        getDiscussionsAsync(topic, count, resolve, reject);
      }),
    },
    getComments: {
      type: commentListType,
      args: {
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { discussionId }) => new Promise((resolve, reject) => {
        getCommentsAsync(discussionId, resolve, reject);
      }),
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
        newTitle: { type: new GraphQLNonNull(GraphQLString) },
        newDescription: { type: new GraphQLNonNull(GraphQLString) },
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
    agreeOrDisagree: {
      type: GraphQLBoolean,
      args: {
        isAgree: { type: new GraphQLNonNull(GraphQLBoolean) },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, { isAgree, shortId }) => new Promise((resolve, reject) => {
        agreeOrDisagreeAsync(isAgree, shortId, resolve, reject);
      }),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });
