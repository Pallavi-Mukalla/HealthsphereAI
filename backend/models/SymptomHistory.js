const mongoose = require('mongoose');

const symptomHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  symptoms: [{
    type: String,
    required: true
  }],
  keySymptoms: [{
    type: String
  }],
  disease: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  location: {
    lat: Number,
    lng: Number
  }
}, {
  timestamps: true
});

// Index for faster queries
symptomHistorySchema.index({ userId: 1, symptoms: 1, disease: 1 });

module.exports = mongoose.model('SymptomHistory', symptomHistorySchema);

