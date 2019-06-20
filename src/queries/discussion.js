const { Discussion } = require('../data');

/**
 * @param {string} topic
 * @param {number} count
 * @param {GraphQlQueryCommonArgs} commonArgs
 */
exports.getDiscussionsAsync = async (topic, count, ...commonArgs) => {
  const [resolve, reject, projection] = commonArgs;

  try {
    let discussions;
    if (topic === 'local') {
      discussions = await Discussion.find({}, projection).sort({ createdAt: -1 }).limit(count)
        .exec();
    }

    resolve(discussions);
  } catch (error) {
    reject(new Error('Couldn\'t get discussions.'));
  }
};

/**
 * @param {string} discussionId
 * @param {GraphQlQueryCommonArgs} commonArgs
 */
exports.getCommentsAsync = async (discussionId, ...commonArgs) => {
  const [resolve, reject] = commonArgs;

  try {
    /** @type {object} */
    const discussion = await Discussion.findOne({ shortId: discussionId }, 'comments').exec();

    if (!discussion) {
      reject(new Error('No discussion exists with this ID.'));
      return;
    }

    resolve(discussion.comments);
  } catch (error) {
    reject(new Error('Couldn\'t get comments for discussion.'));
  }
};
