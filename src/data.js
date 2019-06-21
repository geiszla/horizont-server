const mongoose = require('mongoose');
const shortid = require('shortid');

mongoose.Promise = Promise;
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);


/* ----------------------------------- Database Communication ----------------------------------- */

/**
 * @param {string} address
 * @return {Promise<void>}
 */
exports.connectAsync = async (address) => {
  await mongoose.connect(`mongodb://${address}/horizont`, { useNewUrlParser: true });
};


/* ---------------------------------------- User Schema ----------------------------------------- */

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  username: String,
});

userSchema.index({ username: 1 });

exports.User = mongoose.model('User', userSchema);


/* ------------------------------------ Discussion Schema --------------------------------------- */

const commentSchema = new mongoose.Schema({
  agreedUsernames: [String],
  disagreedUsernames: [String],
  image: String,
  lastEditedAt: Date,
  ownerUsername: String,
  postedAt: { type: Date, default: Date.now },
  shortId: { type: String, default: shortid.generate },
  text: String,
  type: String,
  url: String,
});

const usernameVirtualOptions = { ref: 'user', foreignField: 'username' };
commentSchema.virtual('agreedUsers', {
  ...usernameVirtualOptions, localField: 'agreedUsernames', justOne: false,
});
commentSchema.virtual('disagreedUsers', {
  ...usernameVirtualOptions, localField: 'disagreedUsernames', justOne: false,
});
commentSchema.virtual('owner', {
  ...usernameVirtualOptions, localField: 'ownerUsername', justOne: true,
});

const locationSchema = new mongoose.Schema({
  coordinates: {
    lattitude: Number,
    longitude: Number,
  },
  name: String,
});

// Discussions
const discussionSchema = new mongoose.Schema({
  agreedUsernames: [String],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
  description: String,
  disagreedUsernames: [String],
  image: String,
  isOpen: Boolean,
  lastEditedAt: Date,
  location: locationSchema,
  ownerUsername: String,
  shortId: { type: String, default: shortid.generate },
  title: String,
  url: String,
}, { toObject: { virtuals: true } });

discussionSchema.virtual('owner', {
  ...usernameVirtualOptions, localField: 'ownerUsername', justOne: true,
});
discussionSchema.virtual('agreedUsers', {
  ...usernameVirtualOptions, localField: 'agreedUsernames', justOne: false,
});
discussionSchema.virtual('disagreedUsers', {
  ...usernameVirtualOptions, localField: 'disagreedUsernames', justOne: false,
});

discussionSchema.index({ shortId: 1 });
discussionSchema.index({ 'comments.shortId': 1 });
discussionSchema.index({ createdAt: -1, isOpen: -1 });
discussionSchema.index({ 'location.coordinates': '2d' });

exports.Discussion = mongoose.model('Discussion', discussionSchema);


/* ------------------------------------ News Sources Schema ------------------------------------- */

const newsSourceSchema = new mongoose.Schema({
  articles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  isUser: Boolean,
  name: String,
  url: String,
});

discussionSchema.index({ url: 1 });

exports.NewsSource = mongoose.model('NewsSource', newsSourceSchema);
