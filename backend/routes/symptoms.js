const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeImageWithGemini } = require('../services/geminiService');
const { optionalAuth } = require('../middleware/auth');
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

// Get multilingual image analysis prompts
const getImageAnalysisPrompt = (language = 'en') => {
  const prompts = {
    en: `Analyze this medical image. Identify any visible symptoms, conditions, or abnormalities. Provide a detailed description of what you see.

IMPORTANT: Use ONLY plain text. NO markdown formatting, NO asterisks (*), NO bold/italic, NO special symbols. Write in clear, simple sentences.`,
    hi: `इस चिकित्सा छवि का विश्लेषण करें। किसी भी दृश्यमान लक्षण, स्थितियों, या असामान्यताओं की पहचान करें। आप जो देखते हैं उसका विस्तृत विवरण प्रदान करें।

महत्वपूर्ण: केवल सादा पाठ उपयोग करें। कोई मार्कडाउन फ़ॉर्मेटिंग नहीं, कोई तारांकन (*) नहीं, कोई बोल्ड/इटैलिक नहीं, कोई विशेष प्रतीक नहीं। स्पष्ट, सरल वाक्यों में लिखें।`,
    te: `ఈ వైద్య చిత్రాన్ని విశ్లేషించండి。 कोई भी दृश्यमान लक्षण, स्थितियों, या असामान्यताओं की पहचान करें। आप जो देखते हैं उसका विस्तृत विवरण प्रदान करें।

ముఖ్యమైన: సాదా టెక్స్ట్ మాత్రమే ఉపయోగించండి। कोई मार्कडाउन फ़ॉर्मेटिंग नहीं, कोई तारांकन (*) नहीं, कोई बोल्ड/इटैलिक नहीं, कोई विशेष प्रतीक नहीं। स्पष्ट, सरल वाक्यों में लिखें।`
  };
  return prompts[language] || prompts.en;
};

const getSymptomExtractionPrompt = (analysis, language = 'en') => {
  const prompts = {
    en: `Based on this medical image analysis: "${analysis}", extract a comma-separated list of specific medical symptoms visible in the image. 

Return ONLY symptom names in lowercase, separated by commas. No explanations, no markdown, no symbols, just plain text symptom names.`,
    hi: `इस चिकित्सा छवि विश्लेषण के आधार पर: "${analysis}", छवि में दिखाई देने वाले विशिष्ट चिकित्सा लक्षणों की अल्पविराम-पृथक सूची निकालें।

केवल लोअरकेस में लक्षण नाम लौटाएं, अल्पविराम से अलग किए गए। कोई स्पष्टीकरण नहीं, कोई मार्कडाउन नहीं, कोई प्रतीक नहीं, केवल सादा पाठ लक्षण नाम।`,
    te: `ఈ వైద్య చిత్ర విశ్లేషణ ఆధారంగా: "${analysis}", చిత్రంలో కనిపించే నిర్దిష్ట వైద్య లక్షణాల కామా-విభజిత జాబితాను సంగ్రహించండి।

కేవలం చిన్న అక్షరాలలో లక్షణ పేర్లను తిరిగి ఇవ్వండి, కామాలతో వేరు చేయబడ్డాయి। వివరణలు లేవు, మార్క్డౌన్ లేదు, చిహ్నాలు లేవు, కేవలం సాదా టెక్స్ట్ లక్షణ పేర్లు।`
  };
  return prompts[language] || prompts.en;
};

const getDiseasePrompt = (analysis, language = 'en') => {
  const prompts = {
    en: `Based on this medical image analysis: "${analysis}", identify the most likely disease or medical condition. 

Return ONLY the disease name in plain text. No markdown, no symbols, no formatting, just the disease name.`,
    hi: `इस चिकित्सा छवि विश्लेषण के आधार पर: "${analysis}", सबसे संभावित बीमारी या चिकित्सा स्थिति की पहचान करें।

केवल सादा पाठ में बीमारी का नाम लौटाएं। कोई मार्कडाउन नहीं, कोई प्रतीक नहीं, कोई फ़ॉर्मेटिंग नहीं, केवल बीमारी का नाम।`,
    te: `ఈ వైద్య చిత్ర విశ్లేషణ ఆధారంగా: "${analysis}", అత్యంత సంభావ్య వ్యాధి లేదా వైద్య పరిస్థితిని గుర్తించండి।

కేవలం సాదా టెక్స్ట్లో వ్యాధి పేరును తిరిగి ఇవ్వండి। మార్క్డౌన్ లేదు, చిహ్నాలు లేవు, ఫార్మాటింగ్ లేదు, కేవలం వ్యాధి పేరు।`
  };
  return prompts[language] || prompts.en;
};

/* ---------------- TEXT CLEANING UTILITY ---------------- */
function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown lists markers but keep content
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

/**
 * POST /api/symptoms/extract-image
 * Extract symptoms and disease from uploaded medical image
 */
router.post('/extract-image', optionalAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  try {
    // Get user language preference
    const userLanguage = req.user ? await getUserLanguage(req.user._id) : 'en';

    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');

    // Analyze image with Gemini Vision (in user's language)
    const analysisPrompt = getImageAnalysisPrompt(userLanguage);
    const analysis = await analyzeImageWithGemini(imageBase64, analysisPrompt);

    if (!analysis) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to analyze image' });
    }

    // Extract symptoms from analysis using Gemini (in user's language)
    const symptomPrompt = getSymptomExtractionPrompt(analysis, userLanguage);
    const symptomText = await analyzeImageWithGemini(imageBase64, symptomPrompt);

    // Parse symptoms
    let symptoms = [];
    if (symptomText) {
      symptoms = symptomText
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 2 && !s.includes('symptom') && !s.includes('condition'));
    }

    // If no symptoms extracted, try pattern matching
    if (symptoms.length === 0) {
      symptoms = extractSymptomsFromAnalysis(analysis);
    }

    // Predict disease from image (in user's language)
    const diseasePrompt = getDiseasePrompt(analysis, userLanguage);
    const disease = await analyzeImageWithGemini(imageBase64, diseasePrompt);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      analysis: cleanMarkdown(analysis),
      symptoms: symptoms.length > 0 ? symptoms : ['visual abnormality detected'],
      disease: cleanMarkdown(disease || 'Unknown condition'),
      source: 'gemini_vision'
    });

  } catch (error) {
    console.error('Image processing error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Error processing image: ' + error.message });
  }
});

/**
 * Helper function to extract symptoms from text analysis
 */
function extractSymptomsFromAnalysis(analysis) {
  const symptoms = [];
  const text = analysis.toLowerCase();

  const symptomPatterns = {
    'rash': /rash|redness|irritation|hives|erythema/i,
    'swelling': /swelling|swollen|puffiness|inflammation|edema/i,
    'discoloration': /discoloration|discolored|yellow|blue|purple|jaundice/i,
    'wound': /wound|cut|abrasion|injury|laceration/i,
    'bruise': /bruise|bruising|contusion|hematoma/i,
    'blister': /blister|vesicle|bulla/i,
    'ulcer': /ulcer|sore|lesion/i,
    'scab': /scab|crust|eschar/i
  };

  for (const [symptom, pattern] of Object.entries(symptomPatterns)) {
    if (pattern.test(text) && !symptoms.includes(symptom)) {
      symptoms.push(symptom);
    }
  }

  return symptoms;
}

module.exports = router;
