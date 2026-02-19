const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, alias: 'Name' },

  speciality: { type: String, required: true, alias: 'Speciality' },

  experience: { type: Number, default: null },

  qualification: { type: String, default: null, alias: 'Qualification' },

  hospital: { type: String, default: null, alias: 'Hospital Name' },

  address: { type: String, default: null },

  district: { type: String, default: null, alias: 'District' }

}, {
  timestamps: true,
  collection: 'doctorslist'
});


// ===========================================
// PERFORMANCE INDEXES
// ===========================================

// 1️⃣ Fast filtering by speciality + district
doctorSchema.index({ speciality: 1, district: 1 });

// 2️⃣ Fast district-only search
doctorSchema.index({ district: 1 });

// 3️⃣ TEXT SEARCH INDEX (🔥 Important Upgrade)
doctorSchema.index({
  name: "text",
  speciality: "text",
  hospital: "text",
  qualification: "text",
  address: "text"
});


// Optional: weight specialties higher
doctorSchema.index(
  {
    name: "text",
    speciality: "text",
    hospital: "text"
  },
  {
    weights: {
      speciality: 5,
      name: 3,
      hospital: 2
    }
  }
);


module.exports = mongoose.model('Doctor', doctorSchema, 'doctorslist');
