const express = require('express');
const axios = require('axios');
const { optionalAuth } = require('../middleware/auth');
const { fetchWikipedia, searchWikipediaMulti } = require('../services/wikipediaService');
const { fetchWHOData, isHealthQuery } = require('../services/whoService');
const { isMathQuery, verifyMath, extractMathExpressions } = require('../services/mathService');
const { getSemanticSimilarity } = require('../services/similarityService');
const { translateText, detectLanguageHeuristic } = require('../services/translationService');
const VerificationResult = require('../models/VerificationResult');
const ChatHistory = require('../models/ChatHistory');

const router = express.Router();
const PYTHON_URL = () => process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// --- Stopwords ----------------------------------------------------------------
const STOPWORDS = new Set([
  'and','is','are','the','a','an','of','in','on','to','for','with','was','were',
  'be','been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','not','but','or','nor','so','yet','both',
  'either','neither','only','own','same','than','too','very','just','because',
  'as','until','while','this','that','these','those','it','its','which','who',
  'what','when','where','how','all','each','every','some','such','no','i','me',
  'my','we','our','you','your','he','his','she','her','they','them','their',
  'there','here','also','however','therefore','thus','about','into','through',
  'during','before','after','above','below','between','out','off','over','under',
  'again','further','then','once','more','most','other','few','up','from','by','at',
]);

// --- Is this a pure math query? -----------------------------------------------
function isRealMathQuery(text) {
  const trimmed = text.trim();
  if (trimmed.length > 120) return false;
  return /\d\s*[\+\-\*\/\^=]\s*\d/.test(trimmed);
}

// --- Extract keywords — supports Devanagari -----------------------------------
function extractKeywordsFromText(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
    .map(([w]) => w)
    .slice(0, 8);
}

// --- Build Wikipedia search query --------------------------------------------
function buildWikiQuery(text, keywords) {
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^\w\u0900-\u097F]/g, '');
    const w2 = words[i + 1].replace(/[^\w\u0900-\u097F]/g, '');
    if (/^[A-Z][a-z]{1,}$/.test(w1) && /^[A-Z][a-z]{1,}$/.test(w2)) return w1 + ' ' + w2;
  }
  const proper = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  if (proper.length > 0) return [...new Set(proper)].slice(0, 2).join(' ');
  if (keywords.length >= 2) return keywords.slice(0, 3).join(' ');
  return text.split(/[.!?\n]/)[0].trim().slice(0, 80);
}

// --- JS text similarity (F1 chunk-based) — supports Devanagari ---------------
function computeTextScore(inputText, sourceText) {
  const inputTokens = inputText
    .toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  if (inputTokens.length === 0) return { accuracy: 50, confidence: 20, differences: [] };

  const sourceWords = sourceText.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < sourceWords.length; i += 90)
    chunks.push(sourceWords.slice(i, i + 120).join(' '));
  if (chunks.length === 0) chunks.push(sourceText);

  const chunkScores = chunks.map((chunk) => {
    const ct = chunk.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
    const cs = new Set(ct);
    const matched = inputTokens.filter((w) => cs.has(w)).length;
    if (matched === 0) return 0;
    const precision = matched / ct.length;
    const recall = matched / inputTokens.length;
    return (2 * precision * recall) / (precision + recall);
  });

  const bestF1 = Math.max(...chunkScores);
  const srcAll = new Set(sourceText.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').split(/\s+/).filter((w) => w.length > 1));
  const globalRecall = inputTokens.filter((w) => srcAll.has(w)).length / inputTokens.length;
  const differences = inputTokens.filter((w) => !srcAll.has(w) && w.length > 2)
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);

  const rawScore = bestF1 * 0.70 + globalRecall * 0.30;
  const accuracy = Math.round(Math.min(100, Math.max(0, rawScore * 200)));
  const confidence = Math.round(Math.min(95, Math.max(20, (bestF1 * 0.5 + globalRecall * 0.5) * 100)));
  return { accuracy, confidence, differences };
}

// --- Persist -----------------------------------------------------------------
async function persist(req, rawInput, answerText, verificationData, chatId) {
  if (!req.user) return;
  try {
    await VerificationResult.create({
      userId: req.user._id,
      inputText: rawInput,
      detectedLanguage: verificationData.detectedLanguage || 'en',
      inputType: verificationData.inputType || 'general',
      accuracyScore: verificationData.accuracy,
      hallucinationScore: verificationData.hallucination,
      confidenceScore: verificationData.confidence,
      correctAnswer: verificationData.correct_answer || '',
      sourceUrl: verificationData.sources?.[0] || '',
      sourceName: verificationData.sourceName || 'Wikipedia',
      keyMatches: verificationData.keyMatches || [],
      semanticSimilarity: verificationData.accuracy,
    });
    if (chatId) {
      await ChatHistory.findByIdAndUpdate(chatId, {
        $push: {
          messages: {
            question: rawInput, answer: answerText,
            verification: {
              accuracy:      verificationData.accuracy,
              hallucination: verificationData.hallucination,
              confidence:    verificationData.confidence,
              correct_answer: verificationData.correct_answer || '',
              explanation:   verificationData.explanation || '',
              sources:       verificationData.sources || [],
              sourceName:    verificationData.sourceName || '',
              inputType:     verificationData.inputType || 'general',
              differences:   verificationData.differences || [],
              keyMatches:    verificationData.keyMatches || [],
              mathResults:   verificationData.mathResults || [],
            },
          },
        },
        updatedAt: Date.now(),
      });
    }
  } catch (e) { console.warn('DB save skipped:', e.message); }
}

// --- POST /api/verify --------------------------------------------------------
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { text, chatId } = req.body;
    if (!text || text.trim().length < 2)
      return res.status(400).json({ error: 'Text too short to verify' });

    const rawInput = text.trim();
    const detectedLang = detectLanguageHeuristic(rawInput);

    // -- MATH PATH -------------------------------------------------------------
    if (isRealMathQuery(rawInput)) {
      const mathExprs = extractMathExpressions(rawInput);
      const exprsToVerify = mathExprs.length > 0 ? mathExprs : [rawInput];
      const mathResults = await Promise.all(exprsToVerify.slice(0, 5).map((e) => verifyMath(e)));
      const verifiable = mathResults.filter((r) => r.correct !== null && r.correct !== undefined && !r.error);

      let accuracy, hallucination, confidence, correct_answer;
      if (verifiable.length === 0) {
        accuracy = 0; hallucination = 100; confidence = 15;
        correct_answer = 'Could not parse the mathematical expression.';
      } else {
        const correctCount = verifiable.filter((r) => r.correct === true).length;
        accuracy = Math.round((correctCount / verifiable.length) * 100);
        hallucination = 100 - accuracy;
        confidence = Math.round(85 + (verifiable.length / exprsToVerify.length) * 14);
        correct_answer = verifiable.map((r) => r.explanation).join(' | ');
      }

      const result = {
        accuracy, hallucination, confidence,
        type: 'math', inputType: 'math',
        inputText: rawInput, detectedLanguage: detectedLang,
        correct_answer, correctAnswer: correct_answer,
        explanation: correct_answer,
        sources: ['https://www.sympy.org'],
        sourceName: 'Math Engine', sourceUrl: 'https://www.sympy.org',
        accuracyScore: accuracy, hallucinationScore: hallucination, confidenceScore: confidence,
        mathResults, differences: [], keyMatches: [], extractedKeywords: [],
        normalized: { hasMath: true, mathParts: mathExprs },
      };
      await persist(req, rawInput, correct_answer, result, chatId);
      return res.json(result);
    }

    // -- TEXT PATH -------------------------------------------------------------
    // Translate non-English input to English for processing
    let workingText = rawInput;
    if (detectedLang !== 'en') {
      const translated = await translateText(rawInput, detectedLang, 'en');
      if (translated && translated !== rawInput) workingText = translated;
    }

    const keywords = extractKeywordsFromText(workingText);
    const wikiQuery = buildWikiQuery(workingText, keywords);

    // Fetch Wikipedia in English
    let sourceData = await fetchWikipedia(wikiQuery, 'en');

    // Enrich if thin
    if (sourceData?.extract && sourceData.extract.length < 150 && keywords.length > 0) {
      const enriched = await fetchWikipedia(wikiQuery + ' ' + keywords.slice(0, 2).join(' '), 'en');
      if ((enriched?.extract?.length || 0) > (sourceData?.extract?.length || 0)) sourceData = enriched;
    }

    // Multi-article fallback
    if (!sourceData?.extract || sourceData.extract.length < 80) {
      const topKw = keywords[0] || wikiQuery.split(' ')[0];
      const articles = await searchWikipediaMulti(topKw, 'en', 3);
      if (articles.length > 0)
        sourceData = articles.reduce((b, a) => (a.extract?.length || 0) > (b.extract?.length || 0) ? a : b);
    }

    // No source found
    if (!sourceData?.extract || sourceData.extract.length < 30) {
      const noSourceMsg = detectedLang === 'hi'
        ? 'इस प्रश्न के लिए कोई विश्वसनीय स्रोत नहीं मिला।'
        : detectedLang === 'mr'
        ? 'या प्रश्नासाठी कोणताही विश्वसनीय स्रोत सापडला नाही.'
        : 'No reliable source found for this query.';
      const result = {
        accuracy: 0, hallucination: 100, confidence: 10,
        type: 'text', inputType: isHealthQuery(rawInput) ? 'health' : 'general',
        inputText: rawInput, detectedLanguage: detectedLang,
        correct_answer: noSourceMsg, correctAnswer: noSourceMsg,
        explanation: 'Wikipedia returned no relevant content for the extracted keywords.',
        sources: ['https://en.wikipedia.org'], sourceName: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org',
        accuracyScore: 0, hallucinationScore: 100, confidenceScore: 10,
        differences: keywords, keyMatches: [], extractedKeywords: keywords,
        normalized: { hasMath: false, mathParts: [] },
      };
      await persist(req, rawInput, result.correct_answer, result, chatId);
      return res.json(result);
    }

    // Compute similarity — English vs English
    let accuracy, confidence, differences;
    try {
      const pyRes = await axios.post(`${PYTHON_URL()}/similarity`,
        { text1: workingText, text2: sourceData.extract }, { timeout: 60000 });
      const d = pyRes.data;
      accuracy   = Math.round(Math.min(100, Math.max(0, (d.similarity ?? 0) * 100)));
      confidence = Math.round(Math.min(95, Math.max(20, (d.confidence ?? 0.4) * 100)));
      differences = d.differences || [];
    } catch {
      const js = computeTextScore(workingText, sourceData.extract);
      accuracy = js.accuracy; confidence = js.confidence; differences = js.differences;
    }

    const hallucination = 100 - accuracy;

    const inputTokens = workingText.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const srcTokens = new Set((sourceData.extract || '').toLowerCase().split(/\W+/));
    const keyMatches = [...new Set(inputTokens.filter((w) => srcTokens.has(w)))].slice(0, 12);

    // Translate Wikipedia answer back to user's language for display
    const englishExtract = sourceData.extract?.slice(0, 500) || '';
    let correct_answer = englishExtract;
    if (detectedLang !== 'en' && englishExtract) {
      const translated = await translateText(englishExtract, 'en', detectedLang);
      if (translated && translated !== englishExtract) correct_answer = translated;
    }

    const explanation = differences.length > 0
      ? `These terms were not found in the verified source: ${differences.join(', ')}`
      : accuracy >= 80
        ? 'The response closely matches verified Wikipedia content.'
        : 'The response partially matches verified Wikipedia content.';

    const result = {
      accuracy, hallucination, confidence,
      type: 'text', inputType: isHealthQuery(rawInput) ? 'health' : 'general',
      inputText: rawInput, detectedLanguage: detectedLang,
      correct_answer, correctAnswer: correct_answer,
      explanation,
      sources: sourceData.url ? [sourceData.url] : ['https://en.wikipedia.org'],
      sourceName: sourceData.title || 'Wikipedia', sourceUrl: sourceData.url || '',
      accuracyScore: accuracy, hallucinationScore: hallucination, confidenceScore: confidence,
      differences, keyMatches, extractedKeywords: keywords,
      normalized: { hasMath: false, mathParts: [] },
    };

    await persist(req, rawInput, correct_answer.slice(0, 300), result, chatId);
    return res.json(result);

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

// --- GET /api/verify/history -------------------------------------------------
router.get('/history', require('../middleware/auth').auth, async (req, res) => {
  try {
    const results = await VerificationResult.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
