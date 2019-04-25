const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion } = require('../database');

const request = requestPromise.defaults({
  proxy: 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});

exports.addDiscussionByUrl = async (url, resolve, reject) => {
  let newDiscussion;

  try {
    newDiscussion = await new Discussion({
      createdAt: new Date(),
      owner: 'testuser',
      url,
    }).save();

    const discussionData = await getDiscussionData(newDiscussion);
    newDiscussion = Object.assign(newDiscussion, discussionData);

    await newDiscussion.save();
    resolve();
  } catch ({ message }) {
    reject('An error occurred while creating discussion.');
  }
};

exports.postComment = async (text, discussionId, resolve, reject) => {
  const discussion = await Discussion.findOne({ shortId: discussionId }).exec();

  if (!discussion) {
    reject('Post does not exist.');
    return;
  }

  try {
    discussion.comments.push({
      text,
      user: 'testuser',
      postedAt: new Date(),
    });
    discussion.save();

    resolve();
  } catch ({ message }) {
    reject('An error occurred while posting comment.');
  }
};

async function getDiscussionData(discussion) {
  if (!discussion.url) {
    throw TypeError('The argument "discussion" must have an "url" attribute.');
  }

  const discussionData = {};
  discussionData.url = addhttp(discussion.url);

  const response = await request(discussionData.url);
  const { document } = domino.createWindow(response);

  const extendedImageRules = metadataRuleSets.image;
  extendedImageRules.rules.push(['img[src]', element => element.src]);

  const metadata = getMetadata(document, discussionData.url, {
    ...metadataRuleSets,
    image: extendedImageRules,
  });

  discussionData.description = metadata.description;
  discussionData.image = metadata.image;
  discussionData.title = metadata.title;

  return discussionData;
}

// From https://stackoverflow.com/a/24657561/2058437
function addhttp(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return `http://${url}`;
  }

  return url;
}
