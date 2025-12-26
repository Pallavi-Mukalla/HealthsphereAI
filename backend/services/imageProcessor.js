const fs = require('fs');
const { analyzeImageWithGemini } = require('./geminiService');

async function processImage(imagePath) {
  try {
    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // Analyze with Gemini Vision
    const analysis = await analyzeImageWithGemini(
      imageBase64,
      'Analyze this medical image. Identify any visible symptoms, conditions, or abnormalities. Provide a detailed description.'
    );

    // Extract disease from image
    const diseasePrompt = `Based on this image analysis: "${analysis}", identify the most likely disease or medical condition. Return only the disease name.`;
    const disease = await analyzeImageWithGemini(imageBase64, diseasePrompt);

    // Extract symptoms from analysis
    const symptoms = extractSymptomsFromAnalysis(analysis);

    return {
      analysis,
      disease,
      symptoms,
      source: 'gemini_vision'
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

function extractSymptomsFromAnalysis(analysis) {
  const symptoms = [];
  const text = analysis.toLowerCase();

  const symptomPatterns = {
    'rash': /rash|redness|irritation|hives/i,
    'swelling': /swelling|swollen|puffiness|inflammation/i,
    'discoloration': /discoloration|discolored|yellow|blue|purple/i,
    'wound': /wound|cut|abrasion|injury/i,
    'bruise': /bruise|bruising|contusion/i
  };

  for (const [symptom, pattern] of Object.entries(symptomPatterns)) {
    if (pattern.test(text)) {
      symptoms.push(symptom);
    }
  }

  return symptoms;
}

module.exports = {
  processImage
};

