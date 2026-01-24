const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { callGemini } = require('../services/geminiService');
const UserHistory = require('../models/UserHistory');
const User = require('../models/User');

// Get user's language preference
const getUserLanguage = async (userId) => {
  const user = await User.findById(userId).select('language');
  return user?.language || 'en';
};

// Translate prompts based on language
const getChatPrompt = (userQuestion, language, userName) => {
  const prompts = {
    en: `You are a personalized health assistant for ${userName || 'the user'}. 
Answer the following question in a helpful, clear, and personalized manner.

Question: ${userQuestion}

Instructions:
- If the question is about the user's personal health history or previous diagnoses, provide personalized answers based on context
- If the question is generic (about health, symptoms, diseases in general), provide general medical information
- Always be clear, concise, and helpful
- Use plain text only, no markdown formatting
- If you don't have enough information, ask clarifying questions

Provide a clear, helpful answer:`,
    
    hi: `आप ${userName || 'उपयोगकर्ता'} के लिए एक व्यक्तिगत स्वास्थ्य सहायक हैं।
निम्नलिखित प्रश्न का उत्तर सहायक, स्पष्ट और व्यक्तिगत तरीके से दें।

प्रश्न: ${userQuestion}

निर्देश:
- यदि प्रश्न उपयोगकर्ता के व्यक्तिगत स्वास्थ्य इतिहास या पिछले निदान के बारे में है, तो संदर्भ के आधार पर व्यक्तिगत उत्तर दें
- यदि प्रश्न सामान्य है (स्वास्थ्य, लक्षण, सामान्य रूप से बीमारियों के बारे में), तो सामान्य चिकित्सा जानकारी प्रदान करें
- हमेशा स्पष्ट, संक्षिप्त और सहायक रहें
- केवल सादा पाठ उपयोग करें, कोई मार्कडाउन फ़ॉर्मेटिंग नहीं
- यदि आपके पास पर्याप्त जानकारी नहीं है, तो स्पष्टीकरण प्रश्न पूछें

एक स्पष्ट, सहायक उत्तर प्रदान करें:`,
    
    te: `మీరు ${userName || 'వినియోగదారు'} కోసం వ్యక్తిగత ఆరోగ్య సహాయకుడు.
క్రింది ప్రశ్నకు సహాయకరమైన, స్పష్టమైన మరియు వ్యక్తిగత పద్ధతిలో సమాధానం ఇవ్వండి.

ప్రశ్న: ${userQuestion}

సూచనలు:
- ప్రశ్న వినియోగదారు యొక్క వ్యక్తిగత ఆరోగ్య చరిత్ర లేదా మునుపటి రోగనిర్ధారణల గురించి ఉంటే, సందర్భం ఆధారంగా వ్యక్తిగత సమాధానాలు అందించండి
- ప్రశ్న సాధారణమైనది అయితే (సాధారణంగా ఆరోగ్యం, లక్షణాలు, వ్యాధుల గురించి), సాధారణ వైద్య సమాచారం అందించండి
- ఎల్లప్పుడూ స్పష్టమైన, సంక్షిప్తమైన మరియు సహాయకరమైనదిగా ఉండండి
- సాదా టెక్స్ట్ మాత్రమే ఉపయోగించండి, మార్క్డౌన్ ఫార్మాటింగ్ లేదు
- మీకు తగినంత సమాచారం లేకపోతే, స్పష్టీకరణ ప్రశ్నలు అడగండి

స్పష్టమైన, సహాయకరమైన సమాధానం అందించండి:`
  };
  
  return prompts[language] || prompts.en;
};

// Personalized chat endpoint
router.post('/ask', authenticate, async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user._id;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get user's language preference
    const language = await getUserLanguage(userId);
    const userName = req.user.name;

    // Get user's recent history for context
    const recentHistory = await UserHistory.find({ userId, type: 'diagnosis' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('disease symptoms input');

    // Build context from history
    let context = '';
    if (recentHistory.length > 0) {
      const diseases = recentHistory.map(h => h.disease).filter(Boolean);
      const symptoms = recentHistory.flatMap(h => h.symptoms || []).filter(Boolean);
      if (diseases.length > 0 || symptoms.length > 0) {
        context = `User's recent health history: ${diseases.join(', ')}. Recent symptoms: ${symptoms.join(', ')}. `;
      }
    }

    // Create personalized prompt
    const prompt = context + getChatPrompt(question, language, userName);

    // Get response from Gemini
    const response = await callGemini(prompt);

    if (!response) {
      return res.status(500).json({ error: 'Failed to get response' });
    }

    // Save to history
    await UserHistory.create({
      userId,
      type: 'chat',
      input: question,
      response: response,
      language
    });

    res.json({
      answer: response,
      language
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error processing chat: ' + error.message });
  }
});

module.exports = router;
