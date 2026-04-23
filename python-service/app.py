"""
TruthGuard AI — Python NLP Microservice
Handles: semantic similarity, keyword extraction, math verification, normalization.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import re
import math
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─── Lazy-loaded models ───────────────────────────────────────────────────────
_sim_model = None  # all-MiniLM-L6-v2

STOPWORDS = {
    'the','a','an','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'shall','can','in','on','at','to','for','of','with','by','from','up',
    'about','into','through','during','before','after','above','below',
    'between','out','off','over','under','again','further','then','once',
    'and','but','or','nor','so','yet','both','either','neither','not',
    'only','own','same','than','too','very','just','because','as','until',
    'while','although','this','that','these','those','it','its','which',
    'who','what','when','where','how','all','each','every','few','more',
    'most','other','some','such','no','i','me','my','we','our','you',
    'your','he','his','she','her','they','them','their','there','here',
    'also','however','therefore','thus','said','says','according','like',
    'known','called','used','made','first','second','third','one','two',
    'three','four','five','six','seven','eight','nine','ten',
}


def get_sim_model():
    global _sim_model
    if _sim_model is None:
        logger.info("Loading similarity model: all-MiniLM-L6-v2...")
        from sentence_transformers import SentenceTransformer
        _sim_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Similarity model loaded.")
    return _sim_model


def cosine_sim(a, b):
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def normalize(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def strip_latex(text):
    text = re.sub(r'\\\[.*?\\\]', ' ', text, flags=re.DOTALL)
    text = re.sub(r'\\\(.*?\\\)', ' ', text, flags=re.DOTALL)
    text = re.sub(r'\$\$.*?\$\$', ' ', text, flags=re.DOTALL)
    text = re.sub(r'\$.*?\$', ' ', text)
    text = re.sub(r'\\[a-zA-Z]+', ' ', text)
    text = re.sub(r'[{}]', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def extract_keywords(text, top_n=20):
    clean = strip_latex(normalize(text))
    tokens = clean.split()
    freq = {}
    for t in tokens:
        if len(t) > 2 and t not in STOPWORDS and not t.isdigit():
            freq[t] = freq.get(t, 0) + 1
    scored = sorted(freq.items(), key=lambda x: x[1] * math.log(len(x[0]) + 1), reverse=True)
    single_kws = [w for w, _ in scored[:top_n]]

    phrases = []
    i = 0
    while i < len(tokens):
        if tokens[i] not in STOPWORDS and len(tokens[i]) > 2 and not tokens[i].isdigit():
            phrase_tokens = [tokens[i]]
            j = i + 1
            while j < len(tokens) and tokens[j] not in STOPWORDS and len(tokens[j]) > 2 and j < i + 3:
                phrase_tokens.append(tokens[j])
                j += 1
            if len(phrase_tokens) >= 2:
                phrases.append(' '.join(phrase_tokens))
            i = j
        else:
            i += 1

    return {'keywords': single_kws, 'phrases': list(dict.fromkeys(phrases))[:10]}


def chunk_text(text, chunk_size=200, overlap=50):
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        if i + chunk_size >= len(words):
            break
    return chunks or [text]


def keyword_match_score(input_keywords, source_text):
    if not input_keywords:
        return 0.0
    source_norm = normalize(strip_latex(source_text))
    matched = sum(1 for kw in input_keywords if kw in source_norm)
    return matched / len(input_keywords)


def compute_confidence(chunk_sims):
    if not chunk_sims:
        return 0.5
    top = sorted(chunk_sims, reverse=True)[:3]
    mean_val = float(np.mean(top))
    variance = float(np.var(top)) if len(top) > 1 else 0.0
    return float(np.clip(mean_val * (1.0 - min(variance * 10, 0.5)), 0.30, 0.99))


def find_differences(input_text, source_text, input_keywords):
    source_norm = normalize(strip_latex(source_text))
    return [kw for kw in input_keywords if len(kw) > 3 and kw not in source_norm][:8]


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'all-MiniLM-L6-v2'})


@app.route('/extract-keywords', methods=['POST'])
def extract_keywords_route():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': 'text required'}), 400
        return jsonify(extract_keywords(strip_latex(text)))
    except Exception as e:
        logger.error(f"Keyword extraction error: {e}")
        return jsonify({'error': str(e), 'keywords': [], 'phrases': []}), 500


@app.route('/similarity', methods=['POST'])
def similarity():
    try:
        data = request.get_json()
        raw_input  = data.get('text1', '').strip()
        raw_source = data.get('text2', '').strip()
        if not raw_input or not raw_source:
            return jsonify({'error': 'Both text1 and text2 required'}), 400

        input_text  = strip_latex(raw_input)
        source_text = strip_latex(raw_source)

        model = get_sim_model()
        kw_data = extract_keywords(input_text)
        input_keywords = kw_data['keywords']

        chunks = chunk_text(source_text, chunk_size=200, overlap=50)
        logger.info(f"Input: {len(input_text)} chars | Chunks: {len(chunks)}")

        input_norm  = normalize(input_text)
        chunk_norms = [normalize(c) for c in chunks]
        all_texts   = [input_norm] + chunk_norms

        embeddings = model.encode(all_texts, convert_to_numpy=True, batch_size=32)
        input_emb  = embeddings[0]
        chunk_embs = embeddings[1:]

        chunk_sims = [cosine_sim(input_emb, ce) for ce in chunk_embs]
        best_raw   = max(chunk_sims)
        best_idx   = int(np.argmax(chunk_sims))

        semantic_score = (best_raw + 1) / 2
        kw_score       = keyword_match_score(input_keywords, source_text)
        accuracy       = float(np.clip(semantic_score * 0.70 + kw_score * 0.30, 0.0, 1.0))
        hallucination  = round(1.0 - accuracy, 4)
        confidence     = compute_confidence([(s + 1) / 2 for s in chunk_sims])
        differences    = find_differences(input_text, source_text, input_keywords)

        logger.info(f"semantic={semantic_score:.3f} kw={kw_score:.3f} accuracy={accuracy:.3f}")

        return jsonify({
            'similarity':    round(accuracy, 4),
            'hallucination': round(hallucination, 4),
            'confidence':    round(confidence, 4),
            'differences':   differences,
            'breakdown': {
                'semantic_score':    round(semantic_score, 4),
                'keyword_match':     round(kw_score, 4),
                'best_chunk_index':  best_idx,
                'best_chunk_cosine': round(best_raw, 4),
                'chunks_compared':   len(chunks),
                'keywords_used':     input_keywords[:10],
            }
        })
    except Exception as e:
        logger.error(f"Similarity error: {e}", exc_info=True)
        return jsonify({'error': str(e), 'similarity': 0.5, 'hallucination': 0.5, 'confidence': 0.3, 'differences': []}), 500


@app.route('/math', methods=['POST'])
def math_verify():
    try:
        from sympy import N, sympify
        from sympy.parsing.sympy_parser import (
            parse_expr, standard_transformations, implicit_multiplication_application
        )

        data = request.get_json()
        raw_expression = data.get('expression', '').strip()
        if not raw_expression:
            return jsonify({'error': 'Expression required', 'correct': None, 'result': None}), 400

        expression = strip_latex(raw_expression)
        transformations = standard_transformations + (implicit_multiplication_application,)

        eq_match = re.search(
            r'([\d\s\+\-\*\/\^\(\)\.eE]+)\s*(?:=|equals)\s*([\d\s\+\-\*\/\^\(\)\.eE]+)',
            expression, re.I
        )
        if eq_match:
            lhs_str = eq_match.group(1).strip()
            rhs_str = eq_match.group(2).strip()
            try:
                lhs = parse_expr(lhs_str, transformations=transformations)
                rhs = parse_expr(rhs_str, transformations=transformations)
                lhs_val = float(N(lhs))
                rhs_val = float(N(rhs))
                correct = abs(lhs_val - rhs_val) < 1e-6
                return jsonify({
                    'correct': correct, 'lhs': lhs_val, 'rhs': rhs_val, 'result': lhs_val,
                    'explanation': (
                        f'Expression: {lhs_str} = {lhs_val:.6g}, '
                        f'Claimed: {rhs_val:.6g}. '
                        f'{"✓ Correct" if correct else "✗ Incorrect"}'
                    ),
                })
            except Exception:
                pass

        math_match = re.search(r'[\d][\d\s\+\-\*\/\^\(\)\.]*', expression)
        if math_match:
            expr_str = math_match.group(0).strip()
            if expr_str and any(c.isdigit() for c in expr_str):
                try:
                    expr = parse_expr(expr_str, transformations=transformations)
                    result_val = float(N(expr))
                    return jsonify({'correct': None, 'result': result_val,
                                    'explanation': f'Computed: {expr_str} = {result_val:.6g}'})
                except Exception:
                    pass

        return jsonify({'correct': None, 'result': None,
                        'explanation': 'Unable to verify math — expression could not be parsed.'})
    except Exception as e:
        logger.error(f"Math error: {e}")
        return jsonify({'error': str(e), 'correct': None, 'result': None, 'explanation': 'Unable to verify math'}), 500


@app.route('/normalize', methods=['POST'])
def normalize_response():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': 'text required'}), 400

        raw_math = []
        math_parts = []
        clean = text

        for pattern in [r'\\\[[\s\S]*?\\\]', r'\\\([\s\S]*?\\\)', r'\$\$[\s\S]*?\$\$', r'\$[^$\n]+?\$']:
            def replacer(m):
                raw_math.append(m.group(0))
                cleaned = strip_latex(m.group(0))
                if cleaned:
                    math_parts.append(cleaned)
                return ' [MATH] '
            clean = re.sub(pattern, replacer, clean, flags=re.DOTALL)

        text_part = re.sub(r'\[MATH\]', '', clean).strip()
        text_part = re.sub(r'\s+', ' ', text_part)

        return jsonify({
            'textPart': text_part,
            'mathParts': list(set(math_parts)),
            'cleanText': strip_latex(text),
            'hasMath': len(math_parts) > 0,
            'rawMathExpressions': raw_math,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("Starting TruthGuard Python Service on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=False)
