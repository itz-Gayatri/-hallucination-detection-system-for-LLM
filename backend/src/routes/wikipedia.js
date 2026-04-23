const express = require('express');
const { fetchWikipedia, searchWikipediaMulti } = require('../services/wikipediaService');

const router = express.Router();

// GET /api/wikipedia/search?q=query&lang=en
router.get('/search', async (req, res) => {
  try {
    const { q, lang = 'en' } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const result = await fetchWikipedia(q, lang);
    if (!result) return res.status(404).json({ error: 'No results found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
