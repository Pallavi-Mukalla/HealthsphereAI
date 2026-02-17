const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { callGemini } = require('../services/geminiService');
const User = require('../models/User');

// Helper to get user language
const getUserLanguage = async (userId) => {
  if (!userId) return 'en';
  try {
    const user = await User.findById(userId).select('language');
    return user?.language || 'en';
  } catch {
    return 'en';
  }
};

// Get multilingual doctor recommendation prompt
const getDoctorPrompt = (disease, searchRange, language = 'en') => {
  const prompts = {
    en: `Suggest 3 doctors or medical specialists who are proficient in treating "${disease}". 

IMPORTANT: The disease name "${disease}" may be in English, Hindi, Telugu, or any language. Understand it correctly and suggest appropriate doctors.

Requirements:
- They should be real, reputable medical professionals
- Include their specialty/expertise
- CRITICAL: Suggest doctors${searchRange ? searchRange : ''}. Do NOT suggest doctors outside this range.
- IMPORTANT: Prioritize and list the NEAREST doctors first, sorted by distance from the given coordinates (closest first)
- Include hospital or clinic name if possible
- If location is provided, ensure ALL suggested doctors are strictly within 1-7 kilometers from the given coordinates
- Return doctors in order of proximity, with the nearest doctor listed first in the array

Return ONLY a valid JSON array with this exact structure (list nearest doctors first):
[
  {
    "name": "Doctor Name",
    "specialty": "Specialty Name",
    "hospital": "Hospital/Clinic Name",
    "location": {
      "address": "Full address",
      "city": "City name",
      "state": "State name",
      "lat": latitude_as_number,
      "lng": longitude_as_number
    }
  }
]

IMPORTANT: 
- Include latitude and longitude (lat, lng) in the location object for accurate distance calculation
- Sort doctors by proximity - the nearest doctor should be the first element in the array
- Ensure coordinates are provided as numbers, not strings
- Return valid JSON only - no markdown, no code blocks, just pure JSON array

CRITICAL: Use ONLY plain text. NO markdown, NO asterisks, NO symbols. Return valid JSON only.`,

    hi: `"${disease}" के इलाज में कुशल 3 डॉक्टरों या चिकित्सा विशेषज्ञों का सुझाव दें।

आवश्यकताएं:
- वे वास्तविक, प्रतिष्ठित चिकित्सा पेशेवर होने चाहिए
- उनकी विशेषज्ञता/विशेषज्ञता शामिल करें
- महत्वपूर्ण: डॉक्टरों का सुझाव दें${searchRange ? searchRange : ''}। इस सीमा के बाहर डॉक्टरों का सुझाव न दें।
- महत्वपूर्ण: निकटतम डॉक्टरों को प्राथमिकता दें और पहले सूचीबद्ध करें, दिए गए निर्देशांक से दूरी के अनुसार क्रमबद्ध (निकटतम पहले)
- यदि संभव हो तो अस्पताल या क्लिनिक का नाम शामिल करें
- यदि स्थान प्रदान किया गया है, तो सुनिश्चित करें कि सभी सुझाए गए डॉक्टर दिए गए निर्देशांक से सख्ती से 1-7 किलोमीटर के भीतर हैं
- निकटता के क्रम में डॉक्टर लौटाएं, निकटतम डॉक्टर सरणी में पहले सूचीबद्ध होना चाहिए

केवल वैध JSON सरणी लौटाएं (निकटतम डॉक्टर पहले सूचीबद्ध करें):
[
  {
    "name": "डॉक्टर का नाम",
    "specialty": "विशेषज्ञता का नाम",
    "hospital": "अस्पताल/क्लिनिक का नाम",
    "location": {
      "address": "पूरा पता",
      "city": "शहर का नाम",
      "state": "राज्य का नाम",
      "lat": अक्षांश_संख्या_के_रूप में,
      "lng": देशांतर_संख्या_के_रूप में
    }
  }
]

महत्वपूर्ण:
- सटीक दूरी गणना के लिए स्थान वस्तु में अक्षांश और देशांतर (lat, lng) शामिल करें
- निकटता के अनुसार डॉक्टरों को क्रमबद्ध करें - निकटतम डॉक्टर सरणी का पहला तत्व होना चाहिए
- सुनिश्चित करें कि निर्देशांक संख्याओं के रूप में प्रदान किए गए हैं, स्ट्रिंग नहीं

महत्वपूर्ण: केवल सादा पाठ उपयोग करें। कोई मार्कडाउन नहीं, कोई तारांकन नहीं, कोई प्रतीक नहीं। केवल वैध JSON लौटाएं।`,

    te: `"${disease}" చికిత్సలో నిపుణులైన 3 వైద్యులు లేదా వైద్య నిపుణులను సూచించండి.

ముఖ్యమైన: వ్యాధి పేరు "${disease}" ఇంగ్లీష్, హిందీ, తెలుగు లేదా ఏ భాషలోనైనా ఉండవచ్చు. దీన్ని సరిగ్గా అర్థం చేసుకొని తగిన వైద్యులను సూచించండి.

అవసరాలు:
- అవి నిజమైన, గౌరవనీయమైన వైద్య నిపుణులు కావాలి
- వారి నిపుణత/నైపుణ్యాన్ని చేర్చండి
- క్లిష్టమైన: వైద్యులను సూచించండి${searchRange ? searchRange : ''}। इस सीमा के बाहर डॉक्टरों का सुझाव न दें।
- ముఖ్యమైన: అత్యంత దగ్గరి వైద్యులను ప్రాధాన్యత ఇవ్వండి మరియు మొదట జాబితా చేయండి, ఇచ్చిన కోఆర్డినేట్ల నుండి దూరం ప్రకారం క్రమబద్ధీకరించబడింది (దగ్గరి మొదట)
- సాధ్యమైతే ఆసుపత్రి లేదా క్లినిక్ పేరును చేర్చండి
- స్థానం అందించబడితే, అన్ని సూచించబడిన వైద్యులు ఇచ్చిన కోఆర్డినేట్ల నుండి కఠినంగా 1-7 కిలోమీటర్లలో ఉన్నారని నిర్ధారించండి
- సామీప్యం క్రమంలో వైద్యులను తిరిగి ఇవ్వండి, అత్యంత దగ్గరి వైద్యుడు శ్రేణిలో మొదట జాబితా చేయబడాలి

చెల్లుబాటు అయ్యే JSON శ్రేణిని మాత్రమే తిరిగి ఇవ్వండి (దగ్గరి వైద్యుడు మొదట జాబితా చేయండి):
[
  {
    "name": "వైద్యుడి పేరు",
    "specialty": "నిపుణత పేరు",
    "hospital": "ఆసుపత్రి/క్లినిక్ పేరు",
    "location": {
      "address": "పూర్తి చిరునామా",
      "city": "నగరం పేరు",
      "state": "రాష్ట్రం పేరు",
      "lat": అక్షాంశం_సంఖ్య_గా,
      "lng": రేఖాంశం_సంఖ్య_గా
    }
  }
]

ముఖ్యమైన:
- ఖచ్చితమైన దూరం గణన కోసం స్థానం వస్తువులో అక్షాంశం మరియు రేఖాంశం (lat, lng) చేర్చండి
- సామీప్యం ప్రకారం వైద్యులను క్రమబద్ధీకరించండి - అత్యంత దగ్గరి వైద్యుడు శ్రేణి యొక్క మొదటి మూలకం కావాలి
- కోఆర్డినేట్లు సంఖ్యలుగా అందించబడ్డాయని నిర్ధారించండి, స్ట్రింగ్ కాదు
- చెల్లుబాటు అయ్యే JSON మాత్రమే తిరిగి ఇవ్వండి - మార్క్డౌన్ లేదు, కోడ్ బ్లాక్ లేదు, కేవలం శుద్ధ JSON శ్రేణి

క్లిష్టమైన: సాదా టెక్స్ట్ మాత్రమే ఉపయోగించండి. మార్క్డౌన్ లేదు, తారాగణాలు లేవు, చిహ్నాలు లేవు. చెల్లుబాటు అయ్యే JSON మాత్రమే తిరిగి ఇవ్వండి.`
  };

  return prompts[language] || prompts.en;
};

// --- POST /api/doctors/recommend ---
router.post('/recommend', async (req, res) => {
  const { disease, urgency, userLocation, userId } = req.body;

  try {
    let doctors = [];

    const hasLocation =
      userLocation &&
      userLocation.lat !== undefined &&
      userLocation.lng !== undefined;

    const userLat = hasLocation ? Number(userLocation.lat) : null;
    const userLng = hasLocation ? Number(userLocation.lng) : null;

    // ===============================
    // STEP 1: SEARCH DATABASE
    // ===============================
    if (hasLocation && !isNaN(userLat) && !isNaN(userLng)) {
      let allDoctors = await Doctor.find({
        $or: [
          { specialty: new RegExp(disease, 'i') },
          { specialties: { $in: [new RegExp(disease, 'i')] } }
        ]
      });

      if (!allDoctors || allDoctors.length === 0) {
        console.log(`No doctors found for "${disease}", trying broader search`);
        allDoctors = await Doctor.find({}).limit(20);
      }

      const doctorsWithDistance = allDoctors
        .map(doc => {
          if (!doc.location?.lat || !doc.location?.lng) return null;

          const hospitalLat = Number(doc.location.lat);
          const hospitalLng = Number(doc.location.lng);

          if (isNaN(hospitalLat) || isNaN(hospitalLng)) return null;

          const distance = getDistanceFromLatLonInKm(
            userLat,
            userLng,
            hospitalLat,
            hospitalLng
          );

          return {
            ...doc.toObject(),
            distance: parseFloat(distance.toFixed(2))
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      // Tier 1: 1-7 km
      doctors = doctorsWithDistance.filter(
        doc => doc.distance >= 1 && doc.distance <= 7
      );

      // Tier 2: 10-15 km
      if (!doctors.length) {
        console.log('No doctors in 1-7 km, checking 10-15 km');
        doctors = doctorsWithDistance.filter(
          doc => doc.distance >= 10 && doc.distance <= 15
        );
      }
    } else {
      // No location
      doctors = await Doctor.find({
        $or: [
          { specialty: new RegExp(disease, 'i') },
          { specialties: { $in: [new RegExp(disease, 'i')] } }
        ]
      }).limit(5);

      if (!doctors.length) {
        doctors = await Doctor.find({}).limit(5);
      }
    }

    // ===============================
    // STEP 2: USE GEMINI IF DB FAILS
    // ===============================
    if (!doctors.length) {
      console.log('Using Gemini recommendations');

      const userLanguage = userId
        ? await getUserLanguage(userId)
        : 'en';

      const searchRange =
        hasLocation && !isNaN(userLat) && !isNaN(userLng)
          ? ` near coordinates ${userLat}, ${userLng} within 1-7 kilometers ONLY`
          : '';

      const prompt = getDoctorPrompt(disease, searchRange, userLanguage);
      const aiText = await callGemini(prompt);

      if (aiText) {
        try {
          let parsed = aiText.trim()
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

          doctors = JSON.parse(parsed);

          if (hasLocation && Array.isArray(doctors)) {
            doctors = doctors
              .map(doc => {
                if (!doc.location?.lat || !doc.location?.lng) {
                  return null;
                }

                const hospitalLat = Number(doc.location.lat);
                const hospitalLng = Number(doc.location.lng);

                if (isNaN(hospitalLat) || isNaN(hospitalLng)) {
                  return null;
                }

                const distance = getDistanceFromLatLonInKm(
                  userLat,
                  userLng,
                  hospitalLat,
                  hospitalLng
                );

                return {
                  ...doc,
                  location: {
                    ...doc.location,
                    lat: hospitalLat,
                    lng: hospitalLng
                  },
                  distance: parseFloat(distance.toFixed(2)),
                  source: 'gemini_suggestion'
                };
              })
              .filter(
                doc =>
                  doc &&
                  doc.distance >= 1 &&
                  doc.distance <= 7
              )
              .sort((a, b) => a.distance - b.distance);
          } else {
            doctors = doctors.map(doc => ({
              ...doc,
              distance: null,
              source: 'gemini_suggestion'
            }));
          }
        } catch (err) {
          console.error('Gemini parse error:', err);
          doctors = [];
        }
      }
    } else {
      doctors = doctors.map(doc => ({
        ...doc,
        source: 'database'
      }));
    }

    // ===============================
    // STEP 3: FORMAT RESPONSE
    // ===============================
    const formattedDoctors = doctors.slice(0, 3).map(doc => ({
      name: doc.name || 'Unknown',
      specialty: doc.specialty || disease,
      hospital: doc.hospital || doc.location?.address || 'Not specified',
      location: {
        address: doc.location?.address || 'Address not available',
        city: doc.location?.city || '',
        state: doc.location?.state || '',
        lat: doc.location?.lat ?? null,
        lng: doc.location?.lng ?? null
      },
      rating: doc.rating || null,
      experience: doc.experience || null,
      source: doc.source || 'unknown'
    }));

    console.log(
      `Returning ${formattedDoctors.length} doctor(s) for ${disease}`
    );

    res.json({ doctors: formattedDoctors });

  } catch (err) {
    console.error('Doctor recommendation error:', err);
    res.status(500).json({
      error: 'Error fetching doctors: ' + err.message
    });
  }
});

// --- Helper: Haversine formula for distance ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) { return deg * (Math.PI/180); }

module.exports = router;
