const express = require('express');
const router = express.Router();

/**
 * GET /api/maps/directions
 * Get Google Maps directions URL (client-side will handle the actual display)
 */
router.get('/directions', (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  // Return Google Maps directions URL
  // Format: origin and destination can be lat,lng or address
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

  res.json({
    directionsUrl,
    origin,
    destination
  });
});

module.exports = router;
