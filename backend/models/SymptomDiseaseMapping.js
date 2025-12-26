const mongoose = require('mongoose');

const symptomDiseaseMappingSchema = new mongoose.Schema({
  symptoms: [{
    type: String,
    required: true
  }],
  disease: {
    type: String,
    required: true
  },
  // Add any other fields that might be in your collection
}, {
  collection: 'symptomtodiseasemapping',
  strict: false // Allow fields not in schema
});

module.exports = mongoose.model('SymptomDiseaseMapping', symptomDiseaseMappingSchema, 'symptomtodiseasemapping');

