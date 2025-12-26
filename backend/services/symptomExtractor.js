const mongoose = require('mongoose');
const SymptomDiseaseMapping = require('../models/SymptomDiseaseMapping');
const { analyzeWithGemini } = require('./geminiService');

/**
 * Extract symptoms from text using MongoDB symptomtodiseasemapping collection
 * Falls back to Gemini if no matches found in database
 */
async function extractSymptoms(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const textLower = text.toLowerCase();
  const extractedSymptoms = [];
  const foundSymptoms = new Set();

  try {
    // Get all unique symptoms from MongoDB
    const allMappings = await SymptomDiseaseMapping.find({}).lean();
    const allSymptomsFromDB = new Set();
    
    // Collect all unique symptoms from database
    for (const mapping of allMappings) {
      if (mapping.symptoms && Array.isArray(mapping.symptoms)) {
        mapping.symptoms.forEach(symptom => {
          allSymptomsFromDB.add(symptom.toLowerCase().trim());
        });
      }
    }
    
    // Extract symptoms by matching user text against database symptoms
    const textWords = textLower.split(/\s+/);
    
    for (const dbSymptom of allSymptomsFromDB) {
      const symptomWords = dbSymptom.split(/\s+/);
      
      // Check for exact match
      if (textLower.includes(dbSymptom)) {
        if (!foundSymptoms.has(dbSymptom)) {
          extractedSymptoms.push(dbSymptom);
          foundSymptoms.add(dbSymptom);
        }
        continue;
      }
      
      // Check for word-by-word match (e.g., "knee pain" matches "i have knee pains")
      const hasWordMatch = symptomWords.some(symptomWord => {
        return textWords.some(textWord => {
          // Exact word match
          if (textWord === symptomWord) return true;
          // Partial match (e.g., "pains" contains "pain")
          if (textWord.length >= 3 && symptomWord.length >= 3) {
            return textWord.includes(symptomWord) || symptomWord.includes(textWord);
          }
          return false;
        });
      });
      
      // If most words match, consider it a match
      if (hasWordMatch && symptomWords.length > 0) {
        const matchRatio = symptomWords.filter(sw => 
          textWords.some(tw => tw.includes(sw) || sw.includes(tw))
        ).length / symptomWords.length;
        
        if (matchRatio >= 0.5 && !foundSymptoms.has(dbSymptom)) {
          extractedSymptoms.push(dbSymptom);
          foundSymptoms.add(dbSymptom);
        }
      }
    }

    // If no symptoms found in database, use Gemini to extract
    if (extractedSymptoms.length === 0) {
      try {
        const geminiResponse = await analyzeWithGemini(
          `Extract all medical symptoms from this text: "${text}". Return only a comma-separated list of symptom names in lowercase, nothing else.`
        );
        
        if (geminiResponse) {
          const geminiSymptoms = geminiResponse.split(',')
            .map(s => s.trim().toLowerCase().replace(/[^a-z\s]/g, ''))
            .filter(s => s.length > 2);
          
          geminiSymptoms.forEach(symptom => {
            if (!foundSymptoms.has(symptom)) {
              extractedSymptoms.push(symptom);
              foundSymptoms.add(symptom);
            }
          });
        }
      } catch (error) {
        console.error('Error extracting symptoms with Gemini:', error);
      }
    }

  } catch (error) {
    console.error('Error querying MongoDB for symptoms:', error);
    
    // Fallback to Gemini if MongoDB query fails
    try {
      const geminiResponse = await analyzeWithGemini(
        `Extract all medical symptoms from this text: "${text}". Return only a comma-separated list of symptom names in lowercase, nothing else.`
      );
      
      if (geminiResponse) {
        const geminiSymptoms = geminiResponse.split(',')
          .map(s => s.trim().toLowerCase().replace(/[^a-z\s]/g, ''))
          .filter(s => s.length > 2);
        
        extractedSymptoms.push(...geminiSymptoms);
      }
    } catch (geminiError) {
      console.error('Error extracting symptoms with Gemini fallback:', geminiError);
    }
  }

  // Return unique symptoms, limit to top 10
  const uniqueSymptoms = [...new Set(extractedSymptoms)];
  return uniqueSymptoms.slice(0, 10);
}

/**
 * Identify key symptoms (most important ones for disease prediction)
 */
function identifyKeySymptoms(symptoms) {
  // Return first 5 symptoms as key symptoms
  return {
    keySymptoms: symptoms.slice(0, 5),
    otherSymptoms: symptoms.slice(5)
  };
}

module.exports = {
  extractSymptoms,
  identifyKeySymptoms
};
