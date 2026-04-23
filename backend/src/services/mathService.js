const axios = require('axios');

const MATH_PATTERNS = [
  /\d+\s*[\+\-\*\/\^]\s*\d+/,
  /sqrt|sin|cos|tan|log|factorial/i,
  /\d+\s*=\s*\d+/,
  /equation|formula|calculate|compute|solve/i,
];

function isMathQuery(text) {
  return MATH_PATTERNS.some((p) => p.test(text));
}

function isSafeExpr(expr) {
  return /^[\d\s\+\-\*\/\.\(\)Math\.sqrtsincostalogPIE\*\*]+$/.test(expr.replace(/Math\.\w+/g, '0'));
}

function evalMathJS(expression) {
  try {
    let expr = expression
      .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
      .replace(/\\times/g, '*').replace(/\\div/g, '/')
      .replace(/\\cdot/g, '*')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\^/g, '**')
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/\bsqrt\b/gi, 'Math.sqrt').replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos').replace(/\btan\b/gi, 'Math.tan')
      .replace(/\blog\b/gi, 'Math.log10').replace(/\bln\b/gi, 'Math.log')
      .replace(/\bpi\b/gi, 'Math.PI').replace(/\be\b/gi, 'Math.E')
      .trim();

    const eqMatch = expr.match(/^(.+?)\s*=\s*(.+)$/);
    if (eqMatch) {
      const lhsStr = eqMatch[1].trim();
      const rhsStr = eqMatch[2].trim();
      if (!isSafeExpr(lhsStr) || !isSafeExpr(rhsStr))
        return { correct: null, result: null, explanation: 'Expression contains unsafe characters' };
      // eslint-disable-next-line no-new-func
      const lhsVal = Function(`"use strict"; const Math=globalThis.Math; return (${lhsStr})`)();
      // eslint-disable-next-line no-new-func
      const rhsVal = Function(`"use strict"; const Math=globalThis.Math; return (${rhsStr})`)();
      if (typeof lhsVal !== 'number' || typeof rhsVal !== 'number' || !isFinite(lhsVal) || !isFinite(rhsVal))
        return { correct: null, result: null, explanation: 'Could not evaluate expression' };
      const correct = Math.abs(lhsVal - rhsVal) < 1e-9;
      return {
        correct, lhs: lhsVal, rhs: rhsVal, result: lhsVal,
        explanation: `${lhsStr} = ${lhsVal}, claimed = ${rhsVal}. ${correct ? '✓ Correct' : '✗ Incorrect — correct answer is ' + lhsVal}`,
      };
    }

    if (isSafeExpr(expr)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      if (typeof result === 'number' && isFinite(result))
        return { correct: null, result, explanation: `Computed: ${expression} = ${result}` };
    }
    return { correct: null, result: null, explanation: 'Unable to parse expression' };
  } catch (e) {
    return { correct: null, result: null, explanation: 'Math parse error: ' + e.message };
  }
}

function extractMathExpressions(text) {
  const exprs = [];
  const latexMatches = text.match(/\\\(([^)]+)\\\)|\$([^$]+)\$/g) || [];
  latexMatches.forEach((m) => exprs.push(m.replace(/\\\(|\\\)|\$/g, '').trim()));
  const plainMatches = text.match(/\d[\d\s]*[\+\-\*\/\^][\d\s\.\(\)]*=[\d\s\.\(\)]+/g) || [];
  plainMatches.forEach((m) => exprs.push(m.trim()));
  const simpleMatches = text.match(/\d+\s*[\+\-\*\/\^]\s*\d+/g) || [];
  simpleMatches.forEach((m) => { if (!exprs.some((e) => e.includes(m.trim()))) exprs.push(m.trim()); });
  return [...new Set(exprs)].filter((e) => e.length > 0).slice(0, 5);
}

async function verifyMath(expression) {
  try {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${pythonUrl}/math`, { expression }, { timeout: 10000 });
    if (response.data && !response.data.error) return response.data;
  } catch (_) { /* Python down — use JS engine */ }
  return evalMathJS(expression);
}

module.exports = { isMathQuery, verifyMath, extractMathExpressions, evalMathJS };
