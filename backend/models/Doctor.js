const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: true
  },
  specialties: [{
    type: String
  }],
  location: {
    lat: Number,
    lng: Number,
    address: String,
    city: String,
    state: String
  },
  rating: {
    type: Number,
    default: 0
  },
  experience: Number,
  qualifications: [String],
  contact: {
    phone: String,
    email: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema, 'doctorslist');

