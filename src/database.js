const mongoose = require('mongoose');
const shortid = require('shortid');

mongoose.Promise = Promise;

/* ----------------------------------- Database Communication ----------------------------------- */

exports.connect = async (address) => {
  await mongoose.connect(`mongodb://${address}/horizont`, { useNewUrlParser: true });
  return true;
};


/* ---------------------------------------- User Schema ----------------------------------------- */

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
});

userSchema.index({ username: 1 });

exports.User = mongoose.model('User', userSchema);


/* ------------------------------------ Discussion Schema --------------------------------------- */

const commentSchema = new mongoose.Schema({
  image: String,
  lastEditedAt: Date,
  postedAt: Date,
  text: String,
  type: String,
  url: String,
  user: String,
  userAgreedCount: Number,
  userDisagreedCount: Number,
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
  comments: [commentSchema],
  description: String,
  image: String,
  isOpen: Boolean,
  location: locationSchema,
  owner: String,
  shortId: { type: String, default: shortid.generate },
  title: String,
  url: String,
  usersAgreed: [String],
  usersDisagreed: [String],
});

discussionSchema.index({ createdAt: -1, isOpen: -1 });
discussionSchema.index({ owner: 1, isOpen: -1 });
discussionSchema.index({ 'location.coordinates': '2d' });

exports.Discussion = mongoose.model('Discussion', discussionSchema);


/* ------------------------------------ News Sources Schema ------------------------------------- */

const newsSourceSchema = new mongoose.Schema({
  articles: [mongoose.Schema.ObjectId],
  isUser: Boolean,
  name: String,
  url: String,
});

newsSourceSchema.index({ 'articles.usersAgreed': 1 });
newsSourceSchema.index({ 'articles.usersDisagreed': -1 });

exports.NewsSource = mongoose.model('NewsSource', newsSourceSchema);
