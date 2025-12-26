const express = require('express');
const router = express.Router();
const { predictDiseaseWithFallback } = require('../services/diseasePredictor');
const { analyzeWithGemini, determineUrgency } = require('../services/geminiService');
const SymptomHistory = require('../models/SymptomHistory');

// Predict disease from symptoms
router.post('/predict', async (req, res) => {
  try {
    const { symptoms, keySymptoms, imageAnalysis } = req.body;
    
    // Handle empty symptoms - use Gemini directly
    if (!symptoms || symptoms.length === 0) {
      console.log('No symptoms provided, using Gemini for analysis');
      const disease = await analyzeWithGemini(
        `Based on the user's description, identify the most likely medical condition or disease. Return only the disease/condition name, nothing else.`
      );
      return res.json({ 
        disease: disease || 'Unknown condition', 
        source: 'gemini_fallback', 
        symptoms: [] 
      });
    }

    let disease = null;
    let source = null;

    // If image analysis provided, use Gemini directly
    if (imageAnalysis) {
      disease = await analyzeWithGemini(
        `Based on this image analysis: ${imageAnalysis}, identify the most likely disease. Return only the disease name.`
      );
      source = 'gemini_image';
    } else {
      // Try MongoDB symptomtodiseasemapping first, then Gemini fallback
      disease = await predictDiseaseWithFallback(keySymptoms || symptoms);
      
      if (disease && disease !== 'null' && disease !== null && disease !== '') {
        source = 'mongodb_mapping';
      } else {
        // Final fallback to Gemini if MongoDB didn't return anything
        disease = await analyzeWithGemini(
          `Based on these symptoms: ${symptoms.join(', ')}, identify the most likely disease or medical condition. Return only the disease name, nothing else.`
        );
        source = 'gemini_fallback';
      }
    }

    // Ensure we have a disease
    if (!disease || disease.trim() === '') {
      disease = 'Unknown condition - please consult a doctor';
      source = 'fallback';
    }

    res.json({ disease: disease.trim(), source, symptoms });
  } catch (error) {
    console.error('Error predicting disease:', error);
    // Return a fallback response instead of error
    res.json({ 
      disease: 'Unable to determine - please consult a healthcare professional', 
      source: 'error', 
      symptoms: req.body.symptoms || [] 
    });
  }
});

// Determine urgency level
router.post('/urgency', async (req, res) => {
  try {
    const { symptoms, disease, userId } = req.body;
    
    if (!symptoms || !disease) {
      return res.status(400).json({ error: 'Symptoms and disease are required' });
    }

    // Check saved dataset first
    let urgency = null;
    if (userId) {
      const history = await SymptomHistory.findOne({
        userId,
        symptoms: { $in: symptoms },
        disease
      }).sort({ createdAt: -1 });
      
      if (history) {
        urgency = history.urgency;
      }
    }

    // Confirm with Gemini (or determine if not in history)
    const urgencyFromGemini = await determineUrgency(symptoms, disease);
    
    // Use Gemini result (or saved if Gemini confirms)
    urgency = urgencyFromGemini;

    // Save to database
    if (userId) {
      await SymptomHistory.create({
        userId,
        symptoms,
        disease,
        urgency,
        keySymptoms: symptoms.slice(0, 5)
      });
    }

    res.json({ urgency, symptoms, disease });
  } catch (error) {
    console.error('Error determining urgency:', error);
    res.status(500).json({ error: 'Failed to determine urgency' });
  }
});

module.exports = router;

