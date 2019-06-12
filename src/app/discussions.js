const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion, NewsSource } = require('../database');
const { printVerbose } = require('../log');

// Request options
const request = requestPromise.defaults({
  proxy: 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});


/* ------------------------------------------ Exports ------------------------------------------- */

/**
 * @param {string} urlString
 * @param {ResolveType<any>} resolve
 * @param {RejectType} reject
 */
exports.addDiscussionByUrlAsync = async (urlString, resolve, reject) => {
  const processedUrlString = addHttp(urlString).replace(/[/\s]+$/, '');

  let url;
  try {
    url = new URL(processedUrlString);
  } catch (exception) {
    reject(new Error('The given URL is not valid.'));
    return;
  }

  const existingDiscussion = await Discussion.findOne({ url }).exec();
  const pageData = existingDiscussion || await getPageDataAsync(url.href);

  if (pageData === existingDiscussion) {
    printVerbose('[Discussion] Using page data from existing discussion.');
  }

  resolve(pageData);

  // Create new discussion
  let newDiscussion = new Discussion({
    createdAt: new Date(),
    owner: 'testuser',
    url: url.href,
  });

  // Add page data to discussion
  newDiscussion = Object.assign(newDiscussion, {
    description: pageData.description,
    image: pageData.image,
    location: pageData.location,
    title: pageData.title,
  });

  const sourceUrl = addHttp(url.hostname);
  const existingSource = await NewsSource.findOne({ url: sourceUrl }).exec();
  const newsSource = existingSource || new NewsSource({
    url: sourceUrl,
    name: (await getPageDataAsync(sourceUrl)).title,
    articles: [newDiscussion.id],
  });

  newsSource.save();
};

/**
 * @param {string} text
 * @param {string} discussionId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.postCommentAsync = async (text, discussionId, resolve, reject) => {
  /** @type {object} */
  const discussion = await Discussion.findOne({ shortId: discussionId }).exec();

  if (!discussion) {
    reject(new Error('Post does not exist.'));
    return;
  }

  // Add comment to discussion
  discussion.comments.push({ text, user: 'testuser', postedAt: new Date() });
  // Save discussion
  discussion.save();

  resolve(true);
};


/* ------------------------------------- Locals and helpers ------------------------------------- */

/**
 * @param {string} url
 * @return {Promise<object>}
 */
async function getPageDataAsync(url) {
  // Get html at url and build a DOM from it
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

/**
 * @param {string} url
 * @return {string}
 */
function addHttp(url) {
  // Add "http://" to the url, if it isn't there
  // From https://stackoverflow.com/a/24657561/2058437
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    return `http://${url}`;
  }

  return url;
}
