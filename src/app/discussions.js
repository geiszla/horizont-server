const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion } = require('../database');

// Request options
const request = requestPromise.defaults({
  proxy: 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});

exports.addDiscussionByUrlAsync = async (urlString, resolve, reject) => {
  let url = addHttp(urlString);

  try {
    url = new URL(urlString);
  } catch (exception) {
    reject(new TypeError('The given URL is not valid.'));
    return;
  }

  const existingDiscussion = await Discussion.findOne({ url }).exec();
  const pageData = existingDiscussion || await getPageDataAsync(url);

  resolve(pageData);

  // Create new discussion
  let newDiscussion = new Discussion({
    createdAt: new Date(),
    owner: 'testuser',
    url: url.href.trim('/'),
  });

  // Add page data to discussion
  newDiscussion = Object.assign(newDiscussion, {
    description: existingDiscussion.description,
    image: existingDiscussion.image,
    location: existingDiscussion.location,
    title: existingDiscussion.title,
  });

  await newDiscussion.save();

  resolve();
};

exports.postCommentAsync = async (text, discussionId, resolve, reject) => {
  const discussion = await Discussion.findOne({ shortId: discussionId }).exec();

  if (!discussion) {
    reject('Post does not exist.');
    return;
  }

  try {
    // Add comment to discussion
    discussion.comments.push({ text, user: 'testuser', postedAt: new Date() });
    // Save discussion
    discussion.save();

    resolve();
  } catch ({ message }) {
    reject('An error occurred while posting comment.');
  }
};

async function getPageDataAsync(url) {
  // Get html at url and build a DOM from it
  const response = await request(url.href);
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
