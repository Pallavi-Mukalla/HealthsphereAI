const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const axios = require('axios');
const { callGemini } = require('../services/geminiService');
const { optionalAuth } = require('../middleware/auth');
const UserHistory = require('../models/UserHistory');
const User = require('../models/User');
const { getDiagnosisPrompt, getFollowUpEvaluationPrompt, getFallbackMessages } = require('../utils/multilingualPrompts');

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

const ML_SCRIPT = path.join(__dirname, '../mlservice/diseasePredictor.py');

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

function formatExplanation(disease, why, causes, symptoms, changeReason = null, language = 'en') {
  const subheadings = {
    en: {
      disease: 'Disease:',
      whyOccurs: 'Why it occurs:',
      causes: 'Causes:',
      commonSymptoms: 'Common symptoms:',
      note: 'Note:'
    },
    hi: {
      disease: 'रोग:',
      whyOccurs: 'यह क्यों होता है:',
      causes: 'कारण:',
      commonSymptoms: 'सामान्य लक्षण:',
      note: 'नोट:'
    },
    te: {
      disease: 'వ్యాధి:',
      whyOccurs: 'ఇది ఎందుకు సంభవిస్తుంది:',
      causes: 'కారణాలు:',
      commonSymptoms: 'సాధారణ లక్షణాలు:',
      note: 'గమనిక:'
    }
  };
  
  const headings = subheadings[language] || subheadings.en;
  const parts = [];
  
  parts.push(`${headings.disease} ${disease}`);
  parts.push('');
  parts.push(`${headings.whyOccurs}`);
  parts.push(cleanMarkdown(why));
  parts.push('');
  parts.push(`${headings.causes}`);
  parts.push(cleanMarkdown(causes));
  parts.push('');
  parts.push(`${headings.commonSymptoms} ${symptoms.join(', ')}`);
  
  if (changeReason) {
    parts.push('');
    parts.push(`${headings.note} ${cleanMarkdown(changeReason)}`);
  }
  
  return parts.join('\n');
}

/* ---------------- ML MODEL ---------------- */
const callMLModel = (symptoms) => {
  return new Promise((resolve) => {
    execFile('python', [ML_SCRIPT, JSON.stringify(symptoms)], (error, stdout) => {
      if (error) return resolve(null);
      try {
        const data = JSON.parse(stdout);
        console.log('ML model output:', data);
        resolve(data?.prediction || null);

      } catch {
        resolve(null);
      }
    });
  });
};

/* ---------------- GEMINI CALL ---------------- */
// Using geminiService which handles API key rotation and retry logic

/* ---------------- MAIN ROUTE ---------------- */
router.post('/diagnose', optionalAuth, async (req, res) => {
  const { text, symptoms: userSymptoms = [], followUpAnswers = [] } = req.body;

  const symptoms = text
    ? text.split(',').map(s => s.trim().toLowerCase())
    : userSymptoms.map(s => s.toLowerCase());

  // If follow-up answers are provided, re-evaluate the disease
  if (followUpAnswers && followUpAnswers.length > 0) {
    return handleFollowUpEvaluation(req, res, symptoms, followUpAnswers);
  }

  /* ---- STEP 1: ML DISEASE (OPTIONAL) ---- */
  const mlDisease = await callMLModel(symptoms);

  /* ---- STEP 2: GET USER LANGUAGE ---- */
  const userLanguage = req.user ? await getUserLanguage(req.user._id) : 'en';
  const fallbacks = getFallbackMessages(userLanguage);

  /* ---- STEP 3: SINGLE GEMINI TRIAGE CALL (in user's language) ---- */
  const triagePrompt = getDiagnosisPrompt(symptoms, mlDisease, userLanguage);

  let finalDisease = fallbacks.unknownDisease;
  let followUpQuestions = [];
  let urgencySentence = fallbacks.consultDoctor;
  let why = fallbacks.infoNotAvailable;
  let causes = fallbacks.infoNotAvailable;

  const triageResponse = await callGemini(triagePrompt);
  console.log('Gemini triage raw text:', triageResponse);

  if (triageResponse) {
    try {
      const parsed = JSON.parse(triageResponse);

      finalDisease = cleanMarkdown(parsed.finalDisease || finalDisease);
      followUpQuestions = Array.isArray(parsed.followUpQuestions)
        ? parsed.followUpQuestions.map(q => cleanMarkdown(q)).slice(0, 3)
        : [];

      urgencySentence = cleanMarkdown(parsed.urgency || urgencySentence);
      why = cleanMarkdown(parsed.why || why);
      causes = cleanMarkdown(parsed.causes || causes);

    } catch (err) {
      console.error('Gemini JSON parse error:', err.message);
    }
  }

  /* ---- HARD SAFETY FALLBACKS (in user's language) ---- */
  if (followUpQuestions.length !== 3) {
    followUpQuestions = [
      fallbacks.symptomsWorsening,
      fallbacks.severePain,
      fallbacks.suddenStart
    ];
  }

  if (!urgencySentence || urgencySentence.length < 10) {
    urgencySentence = fallbacks.consultPromptly;
  }

  /* ---- EXPLANATION ---- */
  const explanation = formatExplanation(finalDisease, why, causes, symptoms, null, userLanguage);

  /* ---- NOTE: History saved ONLY after complete flow (in handleFollowUpEvaluation) ---- */
  // This ensures the entire conversation (input → diagnosis → follow-ups → final → urgency → doctors)
  // is stored as ONE entry

  /* ---- FINAL RESPONSE (Initial Diagnosis - No Doctors Yet) ---- */
  // Doctor recommendations will be shown after follow-up questions are answered
  res.json({
    finalDisease,
    explanation,
    followUpQuestions,
    urgencySentence: null, // Urgency will be shown after follow-up evaluation
    recommendedDoctors: [] // Doctors will be shown after follow-up evaluation
  });
});

/* ---------------- HANDLE FOLLOW-UP EVALUATION ---------------- */
async function handleFollowUpEvaluation(req, res, symptoms, followUpAnswers) {
  const { initialDisease, symptoms: requestSymptoms, originalInput, followUpQuestions } = req.body;
  
  // Use symptoms from request if provided (for image-based inputs)
  const finalSymptoms = (requestSymptoms && requestSymptoms.length > 0) 
    ? requestSymptoms.map(s => s.toLowerCase())
    : symptoms;

  /* ---- STEP 1: ML DISEASE (OPTIONAL) ---- */
  const mlDisease = await callMLModel(finalSymptoms);

  /* ---- STEP 2: GET USER LANGUAGE ---- */
  const userLanguage = req.user ? await getUserLanguage(req.user._id) : 'en';
  const fallbacks = getFallbackMessages(userLanguage);

  /* ---- STEP 3: RE-EVALUATE WITH FOLLOW-UP ANSWERS (in user's language) ---- */
  const reEvaluationPrompt = getFollowUpEvaluationPrompt(
    finalSymptoms,
    initialDisease,
    mlDisease,
    followUpAnswers,
    userLanguage
  );

  let finalDisease = fallbacks.unknownDisease;
  let urgencySentence = fallbacks.consultDoctor;
  let why = fallbacks.infoNotAvailable;
  let causes = fallbacks.infoNotAvailable;
  let diseaseChanged = false;
  let changeReason = '';

  const reEvaluationResponse = await callGemini(reEvaluationPrompt);
  console.log('Gemini re-evaluation raw text:', reEvaluationResponse);

  if (reEvaluationResponse) {
    try {
      const parsed = JSON.parse(reEvaluationResponse);

      finalDisease = cleanMarkdown(parsed.finalDisease || finalDisease);
      urgencySentence = cleanMarkdown(parsed.urgency || urgencySentence);
      why = cleanMarkdown(parsed.why || why);
      causes = cleanMarkdown(parsed.causes || causes);
      diseaseChanged = parsed.diseaseChanged || false;
      changeReason = cleanMarkdown(parsed.changeReason || '');

    } catch (err) {
      console.error('Gemini JSON parse error:', err.message);
    }
  }

  if (!urgencySentence || urgencySentence.length < 10) {
    urgencySentence = fallbacks.consultAfterAnswers;
  }

  /* ---- EXPLANATION ---- */
  const explanation = formatExplanation(
    finalDisease, 
    why, 
    causes, 
    finalSymptoms, 
    diseaseChanged && changeReason ? changeReason : null,
    userLanguage
  );

  /* ---- STEP 3: URGENCY (After Follow-up Evaluation) ---- */
  // Urgency is already set above, now display it

  /* ---- STEP 4: DOCTOR RECOMMENDATION (After Final Diagnosis) ---- */
  let recommendedDoctors = [];
  try {
    const doctorRes = await axios.post(`${req.protocol}://${req.get('host')}/api/doctors/recommend`, {
      disease: finalDisease,
      urgency: urgencySentence,
      userLocation: req.body.userLocation,
      userId: req.user?._id
    });
    recommendedDoctors = doctorRes.data?.doctors || [];
  } catch (err) {
    console.error('Error fetching doctor recommendations:', err.message);
    // Continue without doctors if recommendation fails
  }

  /* ---- STEP 4: SAVE COMPLETE CONVERSATION TO HISTORY (if authenticated) ---- */
  // Saves the entire flow: user input → initial diagnosis → follow-ups → final diagnosis → urgency → doctors
  if (req.user) {
    try {
      const user = await User.findById(req.user._id).select('language');
      await UserHistory.create({
        userId: req.user._id,
        type: 'diagnosis',
        input: originalInput || finalSymptoms.join(', '),
        response: {
          // Initial diagnosis info
          initialDisease: initialDisease || null,
          // Follow-up Q&A
          followUpQuestions: followUpQuestions || [],
          followUpAnswers: followUpAnswers || [],
          // Final diagnosis info
          finalDisease,
          explanation,
          urgencySentence,
          diseaseChanged,
          changeReason: changeReason || null,
          // Doctor recommendations
          recommendedDoctors
        },
        symptoms: finalSymptoms,
        disease: finalDisease,
        language: user?.language || 'en'
      });
    } catch (err) {
      console.error('Error saving history:', err.message);
      // Continue even if history save fails
    }
  }

  /* ---- FINAL RESPONSE (After Follow-up Evaluation) ---- */
  // Flow: Final Disease -> Urgency -> Doctor Recommendations
  res.json({
    finalDisease,
    explanation,
    followUpQuestions: [], // No more questions after evaluation
    urgencySentence,
    diseaseChanged,
    changeReason: changeReason || undefined,
    recommendedDoctors
  });
}

module.exports = router;
