const { Discussion } = require('../data');

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
    reject(error, 'Couldn\'t get discussions.');
  }
};

/**
 * @type {GraphQLQueryResolver<{ discussionId: string, count: number }>}
 */
exports.getCommentsAsync = async ({ discussionId, count }, resolve, reject) => {
  try {
    const commentProjection = typeof count === 'number' ? { $slice: count } : 1;

    /** @type {object} */
    const discussion = await Discussion
      .findOne({ shortId: discussionId }, { comments: commentProjection })
      .exec();

    if (!discussion) {
      reject(null, 'No discussion exists with this ID.');
      return;
    }

    resolve(discussion.comments);
  } catch (error) {
    reject(error, 'Couldn\'t get comments for discussion.');
  }
};
