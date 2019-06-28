const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const requestPromise = require('request-promise');

const { Discussion, NewsSource } = require('../data');
const { printVerbose } = require('../log');

// Request options
const request = requestPromise.defaults({
  proxy: process.argv.includes('--production') ? undefined : 'http://localhost:3128/',
  headers: { 'User-Agent': 'Horizont-News' },
});


/* ---------------------------------- Common Request Handlers ----------------------------------- */

/**
 * @type {GraphQLResolver<{ isAgree: boolean, isDiscussion: boolean, shortId: string }, boolean>}
 */
exports.agreeOrDisagreeAsync = async ({ isAgree, isDiscussion, shortId }, resolve, reject) => {
  try {
    const queryOptions = {};
    queryOptions[isDiscussion ? 'shortId' : 'comments.shortId'] = shortId;

    const agreedField = isDiscussion ? 'agreedUsernames' : 'comments.$.agreedUsernames';
    const disagreedField = isDiscussion ? 'disagreedUsernames' : 'comments.$.disagreedUsernames';

    const discussionUpdate = { $addToSet: {}, $pull: {} };
    discussionUpdate.$addToSet[isAgree ? agreedField : disagreedField] = 'testuser';
    discussionUpdate.$pull[isAgree ? disagreedField : agreedField] = 'testuser';

    await Discussion.updateOne(queryOptions, discussionUpdate).exec();

    resolve(true);
  } catch (error) {
    reject(error, 'Couldn\'t set agreement/disagreement.');
  }
};


/* -------------------------------- Discussion Request Handlers --------------------------------- */

/**
 * @type {GraphQLResolver<{ url: string }, MongooseDocument>}
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

    // Update news source with new article
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
    const { n } = await Discussion.deleteOne({ shortId }).exec();
    resolve(n > 0);
  } catch (error) {
    reject(error, 'Couldn\'t delete discussion.');
  }
};

/**
 * @type {GraphQLResolver<{ newTitle: string, newDescription: string, shortId: string }, boolean>}
 */
exports.editDiscussionAsync = async ({ newTitle, newDescription, shortId }, resolve, reject) => {
  try {
    const updateOptions = {};

    if (newTitle || newDescription) {
      updateOptions.lastEditedAt = new Date();

      if (newTitle) {
        updateOptions.title = newTitle;
      }

      if (newDescription) {
        updateOptions.description = newDescription;
      }
    }

    const { n } = await Discussion.updateOne({ shortId }, updateOptions).exec();
    resolve(n > 0);
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
    const { n } = await Discussion.updateOne({ shortId: discussionId }, {
      $push: { comments: { text, ownerUsername: 'testuser' } },
    }).exec();

    resolve(n > 0);
  } catch (error) {
    reject(error, 'Couldn\'t post comment.');
  }
};

/**
 * @type {GraphQLResolver<{ shortId: string }, boolean>}
 */
exports.deleteCommentAsync = async ({ shortId }, resolve, reject) => {
  try {
    const { n } = await Discussion.updateOne({ 'comments.shortId': shortId }, {
      $pull: { comments: { shortId } },
    }).exec();

    resolve(n > 0);
  } catch (error) {
    reject(error, 'Couldn\'t delete comment.');
  }
};

/**
 * @type {GraphQLResolver<{ newText: string, shortId: string }, boolean>}
 */
exports.editCommentAsync = async ({ newText, shortId }, resolve, reject) => {
  try {
    const { n } = await Discussion.updateOne({ 'comments.shortId': shortId }, {
      $set: {
        'comments.$.text': newText,
        'comments.$.lastEditedAt': new Date(),
      },
    }).exec();

    resolve(n > 0);
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
