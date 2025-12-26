const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativeai.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_VISION_API_URL = `https://generativeai.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

async function analyzeWithGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.candidates[0]?.content?.parts[0]?.text;
    return text ? text.trim() : null;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw error;
  }
}

async function analyzeImageWithGemini(imageBase64, prompt = 'Identify any medical symptoms or conditions visible in this image. Return a detailed analysis.') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const response = await axios.post(GEMINI_VISION_API_URL, {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.candidates[0]?.content?.parts[0]?.text;
    return text ? text.trim() : null;
  } catch (error) {
    console.error('Gemini Vision API error:', error.response?.data || error.message);
    throw error;
  }
}

async function chatWithGemini(message, context = {}) {
  const contextPrompt = context.disease 
    ? `Context: User has symptoms: ${context.symptoms?.join(', ') || 'unknown'}, predicted disease: ${context.disease}, urgency: ${context.urgency || 'unknown'}. `
    : '';
  
  const prompt = `${contextPrompt}User message: ${message}\n\nRespond naturally and helpfully as a medical assistant chatbot.`;
  
  return await analyzeWithGemini(prompt);
}

async function determineUrgency(symptoms, disease) {
  const prompt = `Based on these symptoms: ${symptoms.join(', ')}, and the disease: ${disease}, determine the urgency level. 
Return only one word: "low", "medium", "high", or "critical". Consider:
- low: mild symptoms, can wait for routine appointment
- medium: moderate symptoms, should see doctor within 24-48 hours
- high: serious symptoms, should see doctor soon
- critical: emergency symptoms, immediate medical attention needed

Return only the urgency level word, nothing else.`;

  const response = await analyzeWithGemini(prompt);
  const urgency = response?.toLowerCase().trim();
  
  if (['low', 'medium', 'high', 'critical'].includes(urgency)) {
    return urgency;
  }
  
  return 'medium'; // Default
}

async function recommendDoctorsWithGemini(disease, urgency, userLocation) {
  const locationText = userLocation 
    ? `User location: ${userLocation.lat}, ${userLocation.lng}. `
    : '';
  
  const prompt = `${locationText}Recommend 3 doctors for treating ${disease} with ${urgency} urgency level. 
For each doctor, provide: name, specialty, location (city/state), and rating (1-5).
Format as JSON array with fields: name, specialty, location, rating.`;

  try {
    const response = await analyzeWithGemini(prompt);
    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: return empty array
    return [];
  } catch (error) {
    console.error('Error parsing Gemini doctor recommendations:', error);
    return [];
  }
}

module.exports = {
  analyzeWithGemini,
  analyzeImageWithGemini,
  chatWithGemini,
  determineUrgency,
  recommendDoctorsWithGemini
};

