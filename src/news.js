const domino = require('domino');
const { getMetadata, metadataRuleSets } = require('page-metadata-parser');
const request = require('request-promise').defaults({ proxy: 'http://localhost:3128/' });

const { Discussion } = require('./database');

exports.addDiscussionByUrl = async (url, user, callback) => {
  let newDiscussion;

  try {
    newDiscussion = new Discussion({
      comments: [],
      createdAt: new Date(),
      owner: user,
      url,
      usersAgreed: [],
      usersDisagreed: [],
    });

    const discussionData = await getDiscussionData(newDiscussion);
    newDiscussion = Object.assign(newDiscussion, discussionData);

    await newDiscussion.save();
    callback(true);
  } catch (_) {
    callback(false);
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
