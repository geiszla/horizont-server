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
const gqlProjection = require('graphql-advanced-projection');

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
const { printVerbose } = require('./log');


/* ------------------------------------------- Types -------------------------------------------- */

const discussionTypeComposer = composeWithMongoose(Discussion);
const discussionType = discussionTypeComposer.getType();
const commentType = discussionTypeComposer.get('comments').getType();

const { project } = gqlProjection();


/* ------------------------------------------ Queries ------------------------------------------- */

const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getDiscussions: {
      type: new GraphQLNonNull(new GraphQLList(discussionType)),
      args: {
        topic: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (...args) => graphQLResolver(getDiscussionsAsync, ...args),
    },
    getComments: {
      type: new GraphQLNonNull(new GraphQLList(commentType)),
      args: {
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: GraphQLInt },
      },
      resolve: (...args) => graphQLResolver(getCommentsAsync, ...args),
    },
  },
});


/* ----------------------------------------- Mutations ------------------------------------------ */

const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addDiscussionByUrl: {
      type: new GraphQLNonNull(discussionType),
      args: {
        url: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(createDiscussionByUrlAsync, ...args),
    },
    deleteDiscussion: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: {
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(deleteDiscussionAsync, ...args),
    },
    editDiscussion: {
      type: new GraphQLNonNull(discussionType),
      args: {
        newTitle: { type: GraphQLString },
        newDescription: { type: GraphQLString },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(editDiscussionAsync, ...args),
    },
    postComment: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) },
        discussionId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(postCommentAsync, ...args),
    },
    deleteComment: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: {
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(deleteCommentAsync, ...args),
    },
    editComment: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: {
        newText: { type: new GraphQLNonNull(GraphQLString) },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(editCommentAsync, ...args),
    },
    agreeOrDisagree: {
      type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
      args: {
        isAgree: { type: new GraphQLNonNull(GraphQLBoolean) },
        isDiscussion: { type: new GraphQLNonNull(GraphQLBoolean) },
        shortId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (...args) => graphQLResolver(agreeOrDisagreeAsync, ...args),
    },
  },
});

module.exports = new GraphQLSchema({ query: queryType, mutation: mutationType });


/* ------------------------------------------ Helpers ------------------------------------------- */

/**
 * @param {Function} queryHandler
 * @param {any[]} args
 * @return {Promise}
 */
function graphQLResolver(queryHandler, ...args) {
  const [, queryArgs, , info] = args;

  return new Promise((resolve, reject) => {
    const loggerReject = (error, message) => {
      if (error) {
        printVerbose(error.stack);
      }

      reject(new Error(message));
    };

    queryHandler(queryArgs, resolve, loggerReject, project(info));
  });
}
