const axios = require('axios');

const PYTHON_URL = () => process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','in','on','at','to','for','of','with','by','from','up',
  'about','into','through','during','before','after','above','below',
  'between','out','off','over','under','again','further','then','once',
  'and','but','or','nor','so','yet','both','either','neither','not',
  'only','own','same','than','too','very','just','because','as','until',
  'while','although','this','that','these','those','it','its','which','who',
  'what','when','where','how','all','each','every','few','more','most',
  'other','some','such','no','i','me','my','we','our','you','your',
  'he','his','she','her','they','them','their','there','here','also',
]);

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function chunkText(text, size = 150, overlap = 30) {
  const words = text.split(/\s+/);
  if (words.length <= size) return [text];
  const chunks = [];
  const step = size - overlap;
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [text];
}

function computeJSSimilarity(inputText, sourceText) {
  const inputTokens = tokenize(inputText);
  const inputSet = new Set(inputTokens);
  if (inputSet.size === 0) return { accuracy: 0.5, hallucination: 0.5, confidence: 0.3, differences: [] };

  const chunks = chunkText(sourceText, 150, 30);
  const chunkScores = chunks.map((chunk) => {
    const ct = tokenize(chunk);
    const cs = new Set(ct);
    const matched = inputTokens.filter((w) => cs.has(w)).length;
    if (matched === 0) return 0;
    const precision = matched / ct.length;
    const recall = matched / inputTokens.length;
    return (2 * precision * recall) / (precision + recall);
  });

  const bestF1 = Math.max(...chunkScores);
  const sourceAllTokens = new Set(tokenize(sourceText));
  const globalRecall = inputTokens.filter((w) => sourceAllTokens.has(w)).length / inputTokens.length;
  const differences = inputTokens.filter((w) => !sourceAllTokens.has(w) && w.length > 3)
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);

  const rawScore = bestF1 * 0.70 + globalRecall * 0.30;
  const rawAccuracy = Math.min(1.0, rawScore * 2.0);
  const confidence = Math.max(0.25, Math.min(0.95, bestF1 * 0.5 + globalRecall * 0.5));

  return { accuracy: rawAccuracy, hallucination: 1 - rawAccuracy, confidence, differences };
}

async function getSemanticSimilarity(inputText, sourceText) {
  try {
    const res = await axios.post(`${PYTHON_URL()}/similarity`,
      { text1: inputText, text2: sourceText }, { timeout: 90000 });
    const d = res.data;
    return {
      accuracy:      d.similarity     ?? computeJSSimilarity(inputText, sourceText).accuracy,
      hallucination: d.hallucination  ?? 0,
      confidence:    d.confidence     ?? 0.5,
      breakdown:     d.breakdown      || null,
      differences:   d.differences    || [],
    };
  } catch {
    return computeJSSimilarity(inputText, sourceText);
  }
}

function computeScores(simResult) {
  const accuracy      = Math.round(Math.min(100, Math.max(0, simResult.accuracy * 100)));
  const hallucination = 100 - accuracy;
  const confidence    = Math.round(Math.min(99, Math.max(20, (simResult.confidence ?? 0.4) * 100)));
  return { accuracy, hallucination, confidence };
}

module.exports = { getSemanticSimilarity, computeScores, computeJSSimilarity };
