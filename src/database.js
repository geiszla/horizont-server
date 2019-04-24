const mongoose = require('mongoose');
const { printError } = require('./utilities');

mongoose.Promise = Promise;

// Connect
exports.connect = async (address) => {
  try {
    await mongoose.connect(`mongodb://${address}/horizont`, { useNewUrlParser: true });
    return true;
  } catch ({ message }) {
    printError(`Error: ${message}`);
    return false;
  }
};

// User definitions
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
});

userSchema.index({ username: 1 });

exports.User = mongoose.model('User', userSchema);

// News definitions
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

// News sources
const newsSourceSchema = new mongoose.Schema({
  articles: [mongoose.Schema.ObjectId],
  isUser: Boolean,
  name: String,
  url: String,
});

newsSourceSchema.index({ 'articles.usersAgreed': 1 });
newsSourceSchema.index({ 'articles.usersDisagreed': -1 });

exports.NewsSource = mongoose.model('NewsSource', newsSourceSchema);

// Discussions
const discussionSchema = new mongoose.Schema({
  comments: [commentSchema],
  createdAt: Date,
  description: String,
  image: String,
  isOpen: Boolean,
  location: locationSchema,
  owner: String,
  title: String,
  url: String,
  usersAgreed: [String],
  usersDisagreed: [String],
});

discussionSchema.index({ createdAt: -1, isOpen: -1 });
discussionSchema.index({ owner: 1, isOpen: -1 });
newsSourceSchema.index({ 'article.location.coordinates': '2d' });

exports.Discussion = mongoose.model('Discussion', discussionSchema);
