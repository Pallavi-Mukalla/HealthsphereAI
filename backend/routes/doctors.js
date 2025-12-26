const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { recommendDoctorsWithGemini } = require('../services/geminiService');

// Get recommended doctors
router.post('/recommend', async (req, res) => {
  try {
    const { disease, urgency, userLocation } = req.body;
    
    if (!disease) {
      return res.status(400).json({ error: 'Disease is required' });
    }

    // Try to find doctors from database
    const doctors = await Doctor.find({
      specialties: { $regex: new RegExp(disease, 'i') }
    }).limit(10);

    let recommendedDoctors = [];

    if (doctors.length > 0) {
      // Sort by proximity if location provided
      if (userLocation) {
        doctors.sort((a, b) => {
          const distA = calculateDistance(userLocation, a.location);
          const distB = calculateDistance(userLocation, b.location);
          return distA - distB;
        });
      }
      
      recommendedDoctors = doctors.slice(0, 3).map(doc => ({
        name: doc.name,
        specialty: doc.specialty,
        location: doc.location,
        rating: doc.rating,
        distance: userLocation ? calculateDistance(userLocation, doc.location) : null
      }));
    }

    // If not enough doctors, use Gemini
    if (recommendedDoctors.length < 3) {
      const geminiDoctors = await recommendDoctorsWithGemini(disease, urgency, userLocation);
      recommendedDoctors = [...recommendedDoctors, ...geminiDoctors].slice(0, 3);
    }

    res.json({ doctors: recommendedDoctors });
  } catch (error) {
    console.error('Error recommending doctors:', error);
    res.status(500).json({ error: 'Failed to recommend doctors' });
  }
});

// Helper function to calculate distance (Haversine formula)
function calculateDistance(loc1, loc2) {
  if (!loc1 || !loc2 || !loc1.lat || !loc1.lng || !loc2.lat || !loc2.lng) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;

