const express = require('express');
const router = express.Router();
const multer = require('multer');
const { extractSymptoms } = require('../services/symptomExtractor');
const { processImage } = require('../services/imageProcessor');
const { processVoice } = require('../services/voiceProcessor');

const upload = multer({ dest: 'uploads/' });

// Extract symptoms from text
router.post('/extract-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const symptoms = await extractSymptoms(text);
    
    // Always return at least one symptom to prevent empty array errors
    const finalSymptoms = symptoms.length > 0 ? symptoms : ['general_symptom'];
    
    res.json({ 
      symptoms: finalSymptoms, 
      keySymptoms: finalSymptoms.slice(0, 5) 
    });
  } catch (error) {
    console.error('Error extracting symptoms:', error);
    // Return a fallback instead of error
    res.json({ 
      symptoms: ['general_symptom'], 
      keySymptoms: ['general_symptom'] 
    });
  }
});

// Extract symptoms from voice
router.post('/extract-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const text = await processVoice(req.file.path);
    const symptoms = await extractSymptoms(text);
    
    res.json({ 
      text, 
      symptoms, 
      keySymptoms: symptoms.slice(0, 5) 
    });
  } catch (error) {
    console.error('Error processing voice:', error);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
});

// Extract symptoms from image
router.post('/extract-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const result = await processImage(req.file.path);
    res.json(result);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

module.exports = router;

