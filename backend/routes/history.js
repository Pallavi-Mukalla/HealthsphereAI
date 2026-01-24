const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UserHistory = require('../models/UserHistory');

// Get user's chat history
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (type && ['diagnosis', 'chat'].includes(type)) {
      query.type = type;
    }

    const history = await UserHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-userId');

    res.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Error fetching history: ' + error.message });
  }
});

// Get specific history item
router.get('/:id', authenticate, async (req, res) => {
  try {
    const history = await UserHistory.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!history) {
      return res.status(404).json({ error: 'History not found' });
    }

    res.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Error fetching history: ' + error.message });
  }
});

// Delete history item
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const history = await UserHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!history) {
      return res.status(404).json({ error: 'History not found' });
    }

    res.json({ message: 'History deleted successfully' });
  } catch (error) {
    console.error('History delete error:', error);
    res.status(500).json({ error: 'Error deleting history: ' + error.message });
  }
});

module.exports = router;
