const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion, NewsSource } = require('../data');
const { printVerbose } = require('../log');

// Request options
const request = requestPromise.defaults({
  proxy: 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});


/**
 * @param {string} shortId
 * @param {boolean} isAgree
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.agreeOrDisagreeAsync = async (isAgree, shortId, resolve, reject) => {
  try {
    const discussionUpdate = {};
    discussionUpdate[isAgree ? 'agreedUsernames' : 'disagreedUsernames'] = { $push: 'testuser' };

    await Discussion.updateOne({ $or: [{ shortId }, { 'comments.shortId': shortId }] }, {
      $cond: {
        if: { shortId },
        then: discussionUpdate,
        else: { comments: { $elemMatch: { shortId }, discussionUpdate } },
      },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t delete discussion.'));
  }
};

/* -------------------------------- Discussion Request Handlers --------------------------------- */

/**
 * @param {string} urlString
 * @param {ResolveType<any>} resolve
 * @param {RejectType} reject
 */
exports.createDiscussionByUrlAsync = async (urlString, resolve, reject) => {
  const processedUrlString = addHttp(urlString).replace(/[/\s]+$/, '');

  let url;
  try {
    url = new URL(processedUrlString);
  } catch (_) {
    reject(new Error('The given URL is not valid.'));
    return;
  }

  try {
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
  } catch (_) {
    reject(new Error('Couldn\'t create new discussion.'));
  }
};

/**
 * @param {string} shortId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.deleteDiscussionAsync = async (shortId, resolve, reject) => {
  try {
    await Discussion.deleteOne({ shortId }).exec();
    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t delete discussion.'));
  }
};

/**
 * @param {string} newTitle
 * @param {string} newDescription
 * @param {string} shortId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.editDiscussionAsync = async (newTitle, newDescription, shortId, resolve, reject) => {
  try {
    await Discussion.updateOne({ shortId }, {
      title: newTitle,
      description: newDescription,
    }).exec();

    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t edit discussion.'));
  }
};


/* ---------------------------------- Comment Request Handlers ---------------------------------- */

/**
 * @param {string} text
 * @param {string} shortId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.postCommentAsync = async (text, shortId, resolve, reject) => {
  try {
    await Discussion.updateOne({ shortId }, {
      $push: { comments: { text, user: 'testuser', postedAt: new Date() } },
    }).exec();

    resolve(true);
  } catch (_) {
    reject(new Error('Couldn\'t post comment.'));
  }
};

/**
 * @param {string} shortId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.deleteCommentAsync = async (shortId, resolve, reject) => {
  try {
    await Discussion.updateOne({ 'comments.shortId': shortId }, {
      $pull: { comments: { shortId } },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t delete comment.'));
  }
};

/**
 * @param {string} newText
 * @param {string} shortId
 * @param {ResolveType<boolean>} resolve
 * @param {RejectType} reject
 */
exports.editCommentAsync = async (newText, shortId, resolve, reject) => {
  try {
    await Discussion.updateOne({ 'comments.shortId': shortId }, {
      comments: { $elemMatch: { shortId }, text: newText },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t edit comment.'));
  }
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
