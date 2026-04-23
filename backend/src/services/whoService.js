const axios = require('axios');

const WHO_BASE = 'https://ghoapi.azureedge.net/api';

const HEALTH_KEYWORDS = [
  'disease','virus','vaccine','cancer','diabetes','mortality','health',
  'epidemic','pandemic','infection','symptom','treatment','medicine',
  'hospital','doctor','patient','surgery','drug','covid','hiv','aids',
  'malaria','tuberculosis','obesity',
  'बीमारी','रोग','दवा','स्वास्थ्य','आजार','औषध',
];

function isHealthQuery(text) {
  const lower = text.toLowerCase();
  return HEALTH_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchWHOData(query) {
  try {
    const response = await axios.get(`${WHO_BASE}/Indicator`, {
      params: { $filter: `contains(IndicatorName,'${query.split(' ')[0]}')`, $top: 1 },
      timeout: 8000,
    });
    const indicators = response.data?.value;
    if (!indicators || indicators.length === 0) return getFallbackHealthInfo(query);
    const indicator = indicators[0];
    return {
      title: indicator.IndicatorName,
      extract: `WHO Indicator: ${indicator.IndicatorName}. Code: ${indicator.IndicatorCode}. This is verified WHO health data.`,
      url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${indicator.IndicatorCode}`,
      source: 'WHO Global Health Observatory',
    };
  } catch {
    return getFallbackHealthInfo(query);
  }
}

function getFallbackHealthInfo(query) {
  return {
    title: 'WHO Health Information',
    extract: `For accurate health information about "${query}", please consult the World Health Organization at who.int.`,
    url: 'https://www.who.int',
    source: 'WHO',
  };
}

module.exports = { fetchWHOData, isHealthQuery };
