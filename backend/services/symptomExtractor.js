const SymptomDiseaseMapping = require('../models/SymptomDiseaseMapping');
const { analyzeWithGemini } = require('./geminiService');

/**
 * Normalize symptom phrases to clean medical terms
 */
function normalizeSymptoms(symptoms) {
  return symptoms.map(s =>
    s
      .toLowerCase()
      .replace(/^i am having\s+/i, '')
      .replace(/^i have\s+/i, '')
      .replace(/^having\s+/i, '')
      .replace(/^pain in\s+/i, '')
      .replace(/\bmy\b/gi, '')
      .replace(/\bthe\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extract symptoms from text using:
 * 1. Direct parsing
 * 2. Gemini AI
 * 3. MongoDB fallback
 */
async function extractSymptoms(text) {
  if (!text || typeof text !== 'string') return [];

  const extractedSymptoms = [];
  const foundSymptoms = new Set();
  const textLower = text.toLowerCase().trim();

  // -----------------------
  // STEP 1: Direct parsing (commas, "and")
  // -----------------------
  const parts = text
    .split(/,| and /i)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  parts.forEach(part => {
    const cleaned = part
      .toLowerCase()
      .replace(/^[^a-z]+|[^a-z]+$/g, '')
      .trim();

    if (cleaned.length > 2 && !foundSymptoms.has(cleaned)) {
      extractedSymptoms.push(cleaned);
      foundSymptoms.add(cleaned);
    }
  });

  // -----------------------
  // STEP 2: Gemini AI extraction
  // -----------------------
  try {
    const geminiResponse = await analyzeWithGemini(
      `Extract only medical symptom names from this text:
"${text}"

Return a comma-separated list in lowercase.
No sentences. No explanations.`
    );

    if (geminiResponse) {
      geminiResponse
        .split(/,|\n|;/)
        .map(s => s.trim().toLowerCase())
        .forEach(symptom => {
          if (
            symptom.length > 2 &&
            !symptom.includes('symptom') &&
            !symptom.includes('condition') &&
            !foundSymptoms.has(symptom)
          ) {
            extractedSymptoms.push(symptom);
            foundSymptoms.add(symptom);
          }
        });
    }
  } catch (error) {
    console.error('Gemini symptom extraction error:', error);
  }

  // -----------------------
  // STEP 3: MongoDB fallback (only if nothing found)
  // -----------------------
  if (extractedSymptoms.length === 0) {
    try {
      const mappings = await SymptomDiseaseMapping.find({}).lean();

      const dbSymptoms = new Set();
      mappings.forEach(m => {
        if (Array.isArray(m.symptoms)) {
          m.symptoms.forEach(s => dbSymptoms.add(s.toLowerCase().trim()));
        }
      });

      const textWords = textLower.split(/\s+/);

      dbSymptoms.forEach(dbSymptom => {
        if (textLower.includes(dbSymptom) && !foundSymptoms.has(dbSymptom)) {
          extractedSymptoms.push(dbSymptom);
          foundSymptoms.add(dbSymptom);
          return;
        }

        const dbWords = dbSymptom.split(' ');
        const matchCount = dbWords.filter(w =>
          textWords.some(t => t.includes(w) || w.includes(t))
        ).length;

        if (matchCount / dbWords.length >= 0.5 && !foundSymptoms.has(dbSymptom)) {
          extractedSymptoms.push(dbSymptom);
          foundSymptoms.add(dbSymptom);
        }
      });
    } catch (error) {
      console.error('MongoDB symptom lookup error:', error);
    }
  }

  // -----------------------
  // FINAL NORMALIZATION + DEDUP
  // -----------------------
  const normalized = normalizeSymptoms([...new Set(extractedSymptoms)]);

  return normalized.slice(0, 10);
}

/**
 * Identify key symptoms for ML prioritization
 */
function identifyKeySymptoms(symptoms) {
  return {
    keySymptoms: symptoms.slice(0, 5),
    otherSymptoms: symptoms.slice(5)
  };
}

module.exports = {
  extractSymptoms,
  identifyKeySymptoms,
  normalizeSymptoms
};
