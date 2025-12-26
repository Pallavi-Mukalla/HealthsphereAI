const express = require('express');
const router = express.Router();
const { chatWithGemini } = require('../services/geminiService');

// Chat endpoint for follow-up questions
router.post('/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await chatWithGemini(message, context);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;

