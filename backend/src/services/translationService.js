const axios = require('axios');

/**
 * Translate text using MyMemory free API (no key required, 5000 chars/day free).
 * Falls back gracefully if unavailable.
 */
async function translateText(text, fromLang, toLang = 'en') {
  if (fromLang === toLang) return text;
  try {
    const langPair = `${fromLang}|${toLang}`;
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text.slice(0, 500), langpair: langPair },
      timeout: 8000,
    });
    const translated = response.data?.responseData?.translatedText;
    if (translated && translated !== 'PLEASE SELECT TWO DISTINCT LANGUAGES') {
      return translated;
    }
    return text;
  } catch {
    return text;
  }
}

/**
 * Detect language using simple heuristics + Unicode ranges.
 */
function detectLanguageHeuristic(text) {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  if (totalChars > 0 && devanagariCount / totalChars > 0.3) {
    const marathiWords = ['आहे', 'आणि', 'हे', 'ते', 'मी', 'तू', 'आम्ही', 'त्यांनी'];
    const hindiWords   = ['है', 'और', 'यह', 'वह', 'मैं', 'तुम', 'हम', 'उन्होंने'];
    const marathiScore = marathiWords.filter((w) => text.includes(w)).length;
    const hindiScore   = hindiWords.filter((w) => text.includes(w)).length;
    return marathiScore >= hindiScore ? 'mr' : 'hi';
  }
  return 'en';
}

module.exports = { translateText, detectLanguageHeuristic };
