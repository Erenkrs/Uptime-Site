const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  discriminator: String,
  avatar: String,
  premium: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('User', userSchema);
