const mongoose = require('mongoose');
const SymptomDiseaseMapping = require('../models/SymptomDiseaseMapping');
const { analyzeWithGemini } = require('./geminiService');

/**
 * Predict disease from symptoms using MongoDB symptomtodiseasemapping collection
 * Falls back to Gemini API if no match found in database
 */
async function predictDisease(symptoms) {
  if (!symptoms || symptoms.length === 0) {
    return null;
  }

  try {
    // Normalize symptoms to lowercase for matching
    const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
    
    // Get all mappings and filter for matches (more flexible than MongoDB $in)
    const allMappings = await SymptomDiseaseMapping.find({}).lean();
    
    // Filter mappings that have matching symptoms
    const matchingMappings = allMappings.filter(mapping => {
      if (!mapping.symptoms || !Array.isArray(mapping.symptoms)) return false;
      
      const mappingSymptoms = mapping.symptoms.map(s => s.toLowerCase().trim());
      
      // Check if any user symptom matches any mapping symptom
      return normalizedSymptoms.some(userSymptom => {
        return mappingSymptoms.some(dbSymptom => {
          // Exact match
          if (userSymptom === dbSymptom) return true;
          // Partial match (e.g., "knee pain" matches "knee")
          if (userSymptom.includes(dbSymptom) || dbSymptom.includes(userSymptom)) {
            return true;
          }
          // Word-by-word match
          const userWords = userSymptom.split(/\s+/);
          const dbWords = dbSymptom.split(/\s+/);
          return userWords.some(uw => dbWords.some(dw => uw.includes(dw) || dw.includes(uw)));
        });
      });
    });

    if (matchingMappings.length === 0) {
      console.log('No disease found in MongoDB for symptoms:', normalizedSymptoms);
      return null;
    }

    // Score diseases based on how many symptoms match
    const diseaseScores = {};
    
    for (const mapping of matchingMappings) {
      if (mapping.disease && mapping.symptoms) {
        const mappingSymptoms = mapping.symptoms.map(s => s.toLowerCase().trim());
        
        // Count how many user symptoms match mapping symptoms
        const matchingCount = normalizedSymptoms.filter(userSymptom => {
          return mappingSymptoms.some(mappingSymptom => {
            // Exact match
            if (userSymptom === mappingSymptom) return true;
            // Partial match (e.g., "knee pain" matches "knee")
            if (userSymptom.includes(mappingSymptom) || mappingSymptom.includes(userSymptom)) {
              return true;
            }
            // Word-by-word match
            const userWords = userSymptom.split(/\s+/);
            const mappingWords = mappingSymptom.split(/\s+/);
            return userWords.some(uw => mappingWords.some(mw => uw.includes(mw) || mw.includes(uw)));
          });
        }).length;
        
        if (matchingCount > 0) {
          const disease = mapping.disease.toLowerCase().trim();
          if (!diseaseScores[disease]) {
            diseaseScores[disease] = 0;
          }
          // Weight by both matching count and ratio
          const matchRatio = matchingCount / Math.max(normalizedSymptoms.length, mappingSymptoms.length);
          diseaseScores[disease] += matchingCount * (1 + matchRatio);
        }
      }
    }

    // Find the disease with highest score
    if (Object.keys(diseaseScores).length > 0) {
      const bestDisease = Object.keys(diseaseScores).reduce((a, b) => 
        diseaseScores[a] > diseaseScores[b] ? a : b
      );
      
      console.log('Disease found in MongoDB:', bestDisease, 'with score:', diseaseScores[bestDisease]);
      return bestDisease;
    }

    return null;
  } catch (error) {
    console.error('Error predicting disease from MongoDB:', error);
    return null;
  }
}

/**
 * Predict disease with MongoDB first, then Gemini fallback
 */
async function predictDiseaseWithFallback(symptoms) {
  // Try MongoDB first
  let disease = await predictDisease(symptoms);
  
  // If not found in MongoDB, use Gemini
  if (!disease || disease === 'null' || disease === null || disease === '') {
    console.log('Disease not found in MongoDB, using Gemini fallback');
    try {
      disease = await analyzeWithGemini(
        `Based on these symptoms: ${symptoms.join(', ')}, identify the most likely disease or medical condition. Return only the disease name, nothing else.`
      );
      return disease ? disease.trim() : null;
    } catch (error) {
      console.error('Error predicting disease with Gemini:', error);
      return null;
    }
  }
  
  return disease;
}

module.exports = {
  predictDisease,
  predictDiseaseWithFallback
};
