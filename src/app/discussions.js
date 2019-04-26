const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion } = require('../database');

// Request options
const request = requestPromise.defaults({
  proxy: 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});

exports.addDiscussionByUrl = async (url, resolve, reject) => {
  let newDiscussion;

  try {
    // Create new discussion
    newDiscussion = new Discussion({
      createdAt: new Date(),
      owner: 'testuser',
      url,
    });

    // Get page data at url
    const pageData = await getPageData(newDiscussion);
    newDiscussion = Object.assign(newDiscussion, pageData);

    // Save discussion with page data
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
    // Add comment to discussion
    discussion.comments.push({
      text,
      user: 'testuser',
      postedAt: new Date(),
    });
    // Save discussion
    discussion.save();

    resolve();
  } catch ({ message }) {
    reject('An error occurred while posting comment.');
  }
};

async function getPageData(discussion) {
  if (!discussion.url) {
    throw TypeError('The argument "discussion" must have a "url" attribute.');
  }

  // Get html at url and build a DOM from it
  const url = addHttp(discussion.url);
  const response = await request(url);
  const { document } = domino.createWindow(response);

  // Extend default metadata parse rules
  const extendedImageRules = metadataRuleSets.image;
  extendedImageRules.rules.push(['img[src]', element => element.src]);

  // Get the metadata of the DOM using the extended rules
  const metadata = getMetadata(document, url, {
    ...metadataRuleSets,
    image: extendedImageRules,
  });
  metadata.url = url;

  return metadata;
}

// From https://stackoverflow.com/a/24657561/2058437
function addHttp(url) {
  // Add "http://" to the url, if it isn't there
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return `http://${url}`;
  }

  return url;
}
