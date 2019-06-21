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
    reject(new Error('Couldn\'t delete discussion.'));
    printVerbose(error);
  }
};

/* -------------------------------- Discussion Request Handlers --------------------------------- */

/**
 * @type {GraphQLResolver<{ urlString: string }, import('mongoose').Document>}
 */
exports.createDiscussionByUrlAsync = async ({ urlString }, resolve, reject) => {
  const processedUrlString = addHttp(urlString).replace(/[/\s]+$/, '');

  let url;
  try {
    url = new URL(processedUrlString);
  } catch (_) {
    reject(new Error('The given URL is not valid.'));
    return;
  }

  // Create discussion
  try {
    const existingDiscussion = await Discussion.findOne({ url }).exec();
    const pageData = existingDiscussion || await getPageDataAsync(url.href);

    if (pageData === existingDiscussion) {
      printVerbose('[Discussion] Using page data of existing discussion.');
    }

    // Create new discussion
    let newDiscussion = new Discussion({
      createdAt: new Date(),
      ownerUsername: 'testuser',
      url: url.href,
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
      const newPageData = await getPageDataAsync(url.href);

      // Update outdated page data in existing discussions
      const differenceObject = {};
      Object.entries(pageData).forEach(([key, value]) => {
        if (newPageData[key] !== value) {
          differenceObject[key] = newPageData[key];
        }
      });

      if (Object.keys(differenceObject).length > 0) {
        printVerbose('[Discussion] Updating existing discussions.');
        await Discussion.updateOne({ url: url.href }, differenceObject);
      }
    }

    const sourceUrl = addHttp(url.hostname);
    await NewsSource.updateOne({
      url: sourceUrl,
      name: (await getPageDataAsync(sourceUrl)).title,
    }, {
      $push: { articles: newDiscussion.id },
    }, { upsert: true }).exec();
  } catch (error) {
    reject(new Error('Couldn\'t create new discussion.'));
    printVerbose(error);
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
    reject(new Error('Couldn\'t delete discussion.'));
    printVerbose(error);
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
    reject(new Error('Couldn\'t edit discussion.'));
    printVerbose(error);
  }
};


/* ---------------------------------- Comment Request Handlers ---------------------------------- */

/**
 * @type {GraphQLResolver<{ text: string, shortId: string }, boolean>}
 */
exports.postCommentAsync = async ({ text, shortId }, resolve, reject) => {
  try {
    await Discussion.updateOne({ shortId }, {
      $push: { comments: { text, user: 'testuser', postedAt: new Date() } },
    }).exec();

    resolve(true);
  } catch (error) {
    reject(new Error('Couldn\'t post comment.'));
    printVerbose(error);
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
    reject(new Error('Couldn\'t delete comment.'));
    printVerbose(error);
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
    reject(new Error('Couldn\'t edit comment.'));
    printVerbose(error);
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
