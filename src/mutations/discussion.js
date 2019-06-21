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
 * @type {GraphQLResolver<{ shortId: string, isAgree: boolean }, boolean>}
 */
exports.agreeOrDisagreeAsync = async ({ shortId, isAgree }, resolve, reject) => {
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
    reject(error, 'Couldn\'t delete discussion.');
  }
};

/* -------------------------------- Discussion Request Handlers --------------------------------- */

/**
 * @type {GraphQLResolver<{ url: string }, import('mongoose').Document>}
 */
exports.createDiscussionByUrlAsync = async ({ url }, resolve, reject) => {
  const processedUrlString = addHttp(url).replace(/[/\s]+$/, '');

  let urlObject;
  try {
    urlObject = new URL(processedUrlString);
  } catch (error) {
    reject(error, 'The given URL is not valid.');
    return;
  }

  // Create discussion
  try {
    const existingDiscussion = await Discussion.findOne({ url: urlObject.href }).exec();
    const pageData = existingDiscussion || await getPageDataAsync(urlObject.href);

    if (pageData === existingDiscussion) {
      printVerbose('[Discussion] Using page data of existing discussion.');
    }

    // Create new discussion
    let newDiscussion = new Discussion({
      createdAt: new Date(),
      ownerUsername: 'testuser',
      url: urlObject.href,
    });

    // Add page data to discussion
    newDiscussion = Object.assign(newDiscussion, {
      description: pageData.description,
      image: pageData.image,
      location: pageData.location,
      title: pageData.title,
    });

    resolve(newDiscussion);
    newDiscussion.save();

    // Update other discussions and news sources
    if (pageData !== existingDiscussion) {
      const newPageData = await getPageDataAsync(urlObject.href);

      // Update outdated page data in existing discussions
      const differenceObject = {};
      Object.entries(pageData).forEach(([key, value]) => {
        if (newPageData[key] !== value) {
          differenceObject[key] = newPageData[key];
        }
      });

      if (Object.keys(differenceObject).length > 0) {
        printVerbose('[Discussion] Updating existing discussions.');
        await Discussion.updateOne({ url: urlObject.href }, differenceObject);
      }
    }

    const sourceUrl = addHttp(urlObject.hostname);
    await NewsSource.updateOne({
      url: sourceUrl,
      name: (await getPageDataAsync(sourceUrl)).title,
    }, {
      $push: { articles: newDiscussion.id },
    }, { upsert: true }).exec();
  } catch (error) {
    reject(error, 'Couldn\'t create new discussion.');
  }
};

/**
 * @type {GraphQLResolver<{ shortId: string }, boolean>}
 */
exports.deleteDiscussionAsync = async ({ shortId }, resolve, reject) => {
  try {
    await Discussion.deleteOne({ shortId }).exec();
    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t delete discussion.');
  }
};

/**
 * @type {GraphQLResolver<{ newTitle: string, newDescription: string, shortId: string }, boolean>}
 */
exports.editDiscussionAsync = async ({ newTitle, newDescription, shortId }, resolve, reject) => {
  try {
    await Discussion.updateOne({ shortId }, {
      title: newTitle,
      description: newDescription,
    }).exec();

    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t edit discussion.');
  }
};


/* ---------------------------------- Comment Request Handlers ---------------------------------- */

/**
 * @type {GraphQLResolver<{ text: string, discussionId: string }, boolean>}
 */
exports.postCommentAsync = async ({ text, discussionId }, resolve, reject) => {
  try {
    await Discussion.updateOne({ shortId: discussionId }, {
      $push: { comments: { text, ownerUsername: 'testuser', postedAt: new Date() } },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t post comment.');
  }
};

/**
 * @type {GraphQLResolver<{ shortId: string }, boolean>}
 */
exports.deleteCommentAsync = async ({ shortId }, resolve, reject) => {
  try {
    await Discussion.updateOne({ 'comments.shortId': shortId }, {
      $pull: { comments: { shortId } },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t delete comment.');
  }
};

/**
 * @type {GraphQLResolver<{ newText: string, shortId: string }, boolean>}
 */
exports.editCommentAsync = async ({ newText, shortId }, resolve, reject) => {
  try {
    await Discussion.updateOne({ 'comments.shortId': shortId }, {
      comments: { $elemMatch: { shortId }, text: newText },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t edit comment.');
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
