const { Discussion } = require('../data');
const { printVerbose } = require('../log');

/**
 * @type {GraphQLQueryResolver<{ topic: string, count: number }>}
 */
exports.getDiscussionsAsync = async ({ topic, count }, resolve, reject, projection) => {
  try {
    let discussions;
    if (topic === 'local') {
      discussions = await Discussion.find({}, projection).sort({ createdAt: -1 }).limit(count)
        .exec();
    }

    resolve(discussions);
  } catch (error) {
    reject(new Error('Couldn\'t get discussions.'));
    printVerbose(error);
  }
};

/**
 * @type {GraphQLQueryResolver<{ discussionId: string, count: number }>}
 */
exports.getCommentsAsync = async ({ discussionId, count }, resolve, reject) => {
  try {
    /** @type {object} */
    const discussion = await Discussion
      .findOne({ shortId: discussionId }, { comments: { $slice: count } })
      .exec();

    if (!discussion) {
      reject(new Error('No discussion exists with this ID.'));
      return;
    }

    resolve(discussion.comments);
  } catch (error) {
    reject(new Error('Couldn\'t get comments for discussion.'));
    printVerbose(error);
  }
};
