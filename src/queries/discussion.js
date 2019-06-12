const { Discussion } = require('../database');

/**
 * @param {string} topic
 * @param {number} count
 * @param {ResolveType<import('mongoose').Document[]>} resolve
 * @param {RejectType} reject
 */
exports.getDiscussionsAsync = async (topic, count, resolve, reject) => {
  try {
    let discussions;
    if (topic === 'local') {
      discussions = await Discussion.find().limit(count).exec();
    }

    resolve(discussions);
  } catch (error) {
    reject(new Error('Couldn\'t get discussions.'));
  }
};

/**
 * @param {string} discussionId
 * @param {ResolveType<import('mongoose').Document[]>} resolve
 * @param {RejectType} reject
 */
exports.getCommentsAsync = async (discussionId, resolve, reject) => {
  try {
    /** @type {object} */
    const discussion = await Discussion.findOne({ shortId: discussionId }).exec();

    if (!discussion) {
      reject(new Error('No discussion exists with this ID.'));
      return;
    }

    resolve(discussion.comments);
  } catch (error) {
    reject(new Error('Couldn\'t get comments for discussion.'));
  }
};
