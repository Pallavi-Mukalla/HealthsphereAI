const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const {
  predictDiseaseWithGemini,
  getDiseaseDetails,
  resolveConflict,
  generateFollowUpQuestions,
  determineUrgency
} = require('../services/geminiService'); // Correct path to geminiService

// Helper: Predict disease using local ML
function predictWithML(symptoms) {
  return new Promise((resolve) => {
    const script = path.join(__dirname, '../mlservice/diseasePredictor.py');
    execFile('python', [script, JSON.stringify(symptoms)], (err, stdout) => {
      if (err) return resolve(null);
      try {
        const result = JSON.parse(stdout);
        resolve(result.disease || null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Main function: ML + Gemini + Conflict + Details + Follow-ups + Urgency
async function predictFinalDisease(symptoms, followUpAnswers = []) {
  const mlDisease = await predictWithML(symptoms);
  const geminiDisease = await predictDiseaseWithGemini(symptoms);

  let finalDisease = null;
  let conflict = false;

  if (mlDisease && geminiDisease) {
    if (mlDisease.toLowerCase() === geminiDisease.toLowerCase()) {
      finalDisease = mlDisease;
    } else {
      conflict = true;
      finalDisease = await resolveConflict(symptoms, mlDisease, geminiDisease);
    }
  } else {
    finalDisease = mlDisease || geminiDisease;
  }

  if (!finalDisease) finalDisease = 'Unknown condition';

  const details =
    finalDisease !== 'Unknown condition'
      ? await getDiseaseDetails(finalDisease)
      : null;

  const followUpQuestions =
    finalDisease !== 'Unknown condition'
      ? await generateFollowUpQuestions(symptoms, finalDisease)
      : [];

  const urgency =
    finalDisease !== 'Unknown condition' && followUpAnswers.length
      ? await determineUrgency(symptoms, finalDisease, followUpAnswers)
      : null;

  return {
    finalDisease,
    mlDisease,
    geminiDisease,
    conflict,
    details,
    followUpQuestions,
    urgency
  };
}

// --- ROUTES ---

// POST /api/disease/diagnose
router.post('/diagnose', async (req, res) => {
  try {
    const { symptoms, followUpAnswers = [] } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ error: 'Symptoms are required as an array.' });
    }

    const result = await predictFinalDisease(symptoms, followUpAnswers);

    res.json({
      symptoms,
      disease: result.finalDisease,
      mlDisease: result.mlDisease,
      geminiDisease: result.geminiDisease,
      conflict: result.conflict,
      details: result.details,
      followUpQuestions: result.followUpQuestions,
      urgencySentence: result.urgency
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error predicting disease.' });
  }
});

module.exports = router;
