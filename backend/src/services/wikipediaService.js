const axios = require('axios');

const WIKI_HEADERS = {
  'User-Agent': 'TruthGuardAI/1.0 (https://truthguard.ai; contact@truthguard.ai)',
  Accept: 'application/json',
};

async function fetchWikipediaFullText(title, lang = 'en') {
  try {
    const response = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query', titles: title, prop: 'extracts',
        exintro: true, explaintext: true, exsectionformat: 'plain',
        format: 'json', exlimit: 1,
      },
      headers: WIKI_HEADERS, timeout: 10000,
    });
    const pages = response.data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing) return null;
    return {
      title: page.title,
      extract: page.extract?.slice(0, 5000) || '',
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      lang,
    };
  } catch { return null; }
}

async function searchWikipediaMulti(query, lang = 'en', limit = 3) {
  try {
    const searchResp = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query', list: 'search', srsearch: query,
        format: 'json', srlimit: limit, srprop: 'snippet|titlesnippet',
      },
      headers: WIKI_HEADERS, timeout: 10000,
    });
    const results = searchResp.data?.query?.search;
    if (!results || results.length === 0) return [];
    const articles = await Promise.all(results.map((r) => fetchWikipediaFullText(r.title, lang)));
    return articles.filter(Boolean);
  } catch { return []; }
}

async function fetchWikipedia(query, lang = 'en') {
  const wikiLang = lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'en';
  const primaryTerm = query.split(/[.!?\n]/)[0].replace(/[^\w\s]/g, ' ').trim().slice(0, 120);

  try {
    const summaryResp = await axios.get(
      `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(primaryTerm)}`,
      { headers: WIKI_HEADERS, timeout: 8000 }
    );
    const d = summaryResp.data;
    if (d?.extract && d.extract.length > 100) {
      const full = await fetchWikipediaFullText(d.title, wikiLang);
      return {
        title: d.title,
        extract: full?.extract || d.extract,
        url: d.content_urls?.desktop?.page || '',
        thumbnail: d.thumbnail?.source || null,
        lang: wikiLang,
      };
    }
  } catch { /* fall through */ }

  const articles = await searchWikipediaMulti(primaryTerm, wikiLang, 3);
  if (articles.length === 0) {
    if (wikiLang !== 'en') {
      const enArticles = await searchWikipediaMulti(primaryTerm, 'en', 2);
      if (enArticles.length > 0) return mergeArticles(enArticles, 'en');
    }
    return null;
  }
  return mergeArticles(articles, wikiLang);
}

function mergeArticles(articles, lang) {
  const best = articles[0];
  const combinedExtract = articles.map((a) => a.extract).filter(Boolean).join('\n\n').slice(0, 12000);
  return { title: best.title, extract: combinedExtract, url: best.url, lang, sourceCount: articles.length };
}

module.exports = { fetchWikipedia, searchWikipediaMulti, fetchWikipediaFullText };
