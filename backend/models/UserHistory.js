const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['diagnosis', 'chat'],
    required: true
  },
  input: {
    type: String,
    required: true
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  symptoms: [String],
  disease: String,
  language: {
    type: String,
    enum: ['en', 'hi', 'te'],
    default: 'en'
  }
}, {
  timestamps: true
});

// Index for faster queries
userHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserHistory', userHistorySchema);
