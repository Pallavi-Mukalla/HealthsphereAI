const apiKeyManager = require('./apiKeyManager');

const MODEL = 'gemini-2.5-flash';

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

/**
 * Core function to call Gemini API with automatic key rotation and retry
 */
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

  try {
    const res = await apiKeyManager.makeRequest(
      url,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    return rawText ? cleanMarkdown(rawText) : null;
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Analyze text with Gemini (used by symptomExtractor)
 */
async function analyzeWithGemini(prompt) {
  return callGemini(prompt);
}

/**
 * Analyze image with Gemini Vision API
 */
async function analyzeImageWithGemini(imageBase64, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

  try {
    const res = await apiKeyManager.makeRequest(
      url,
      {
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    return rawText ? cleanMarkdown(rawText) : null;
  } catch (err) {
    console.error('Gemini Vision API error:', err.response?.data || err.message);
    return null;
  }
}

// Predict disease with Gemini
async function predictDiseaseWithGemini(symptoms) {
  return callGemini(
    `You are a medical AI.
Symptoms: ${symptoms.join(', ')}.

Return ONLY the most likely disease name as plain text. NO markdown, NO asterisks, NO symbols, NO formatting - just the disease name.`
  );
}

// Get disease details in plain text
async function getDiseaseDetails(disease) {
  return callGemini(
    `Provide medical information about ${disease} in plain text.

Return exactly like this:
Description:
Symptoms:
Causes:

CRITICAL: Use ONLY plain text. NO markdown, NO asterisks (*), NO bold/italic, NO bullet points, NO symbols. Write in clear, simple sentences.`
  );
}

// Resolve conflict between ML and Gemini disease
async function resolveConflict(symptoms, mlDisease, geminiDisease) {
  return callGemini(
    `Symptoms: ${symptoms.join(', ')}
Disease 1: ${mlDisease}
Disease 2: ${geminiDisease}
Which disease is more medically probable?

Return ONLY the disease name in plain text. NO markdown, NO asterisks, NO symbols, just the disease name.`
  );
}

// Generate follow-up questions for urgency
async function generateFollowUpQuestions(symptoms, disease) {
  const questions = await callGemini(
    `Based on disease ${disease} and symptoms ${symptoms.join(', ')}, ask 3 short follow-up questions to assess severity.

Return each question as a plain sentence separated by newline. NO markdown, NO asterisks, NO symbols, just clear questions.`
  );

  return questions ? questions.split('\n').map(q => q.trim()).filter(q => q) : [];
}

// Determine urgency as natural sentence
async function determineUrgency(symptoms, disease, answers = []) {
  const prompt = `
Given the following symptoms: ${symptoms.join(', ')}
Disease: ${disease}
User answers to follow-up questions: ${answers.join(', ')}

Return a single sentence describing the urgency of treatment. Example: "You should seek urgent medical attention immediately."

CRITICAL: Use ONLY plain text. NO markdown, NO asterisks, NO symbols. Plain sentence only, not just "low" or "medium".
`;
  return callGemini(prompt);
}

module.exports = {
  callGemini,
  analyzeWithGemini,
  analyzeImageWithGemini,
  predictDiseaseWithGemini,
  getDiseaseDetails,
  resolveConflict,
  generateFollowUpQuestions,
  determineUrgency
};
