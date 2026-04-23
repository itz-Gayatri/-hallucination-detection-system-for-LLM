const axios = require('axios');

const PYTHON_URL = () => process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Normalize a response — strip LaTeX, extract math parts.
 * Tries Python service first, falls back to JS regex.
 */
async function normalizeResponse(text) {
  try {
    const res = await axios.post(`${PYTHON_URL()}/normalize`, { text }, { timeout: 8000 });
    return res.data;
  } catch {
    return normalizeJS(text);
  }
}

function normalizeJS(text) {
  const mathParts = [];
  let clean = text;

  // Extract LaTeX blocks
  clean = clean.replace(/\\\[[\s\S]*?\\\]/g, (m) => { mathParts.push(m); return ' [MATH] '; });
  clean = clean.replace(/\\\([\s\S]*?\\\)/g, (m) => { mathParts.push(m); return ' [MATH] '; });
  clean = clean.replace(/\$\$[\s\S]*?\$\$/g, (m) => { mathParts.push(m); return ' [MATH] '; });
  clean = clean.replace(/\$[^$\n]+?\$/g,     (m) => { mathParts.push(m); return ' [MATH] '; });

  const textPart = clean.replace(/\[MATH\]/g, '').replace(/\s+/g, ' ').trim();

  return {
    textPart,
    mathParts: [...new Set(mathParts)],
    cleanText: text.replace(/\$.*?\$/g, '').replace(/\\\(.*?\\\)/g, '').trim(),
    hasMath: mathParts.length > 0,
  };
}

module.exports = { normalizeResponse };
