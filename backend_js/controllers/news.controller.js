const { dbQueryAll } = require('../utils/db');
const cache = require('../utils/cache');

/**
 * Extracts and normalizes vocabulary array from raw object or string.
 */
function extractVocabulary(raw) {
  if (!raw) return [];
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    try {
      const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.raw) return extractVocabulary(parsed.raw);
        list = parsed.vocabulary || parsed.vocabularies || parsed.vocab_list || parsed.words || [];
      }
    } catch (_) {}
  } else if (typeof raw === 'object') {
    if (raw.raw) return extractVocabulary(raw.raw);
    list = raw.vocabulary || raw.vocabularies || raw.vocab_list || raw.words || [];
  }

  if (!Array.isArray(list)) return [];

  return list
    .filter(v => v && typeof v === 'object' && (v.word || v.term))
    .map(v => ({
      word: (v.word || v.term || '').trim(),
      ipa: (v.ipa || v.phonetic || '').trim(),
      meaning: (v.meaning_vi || v.meaning || v.definition_vi || v.definition || '').trim(),
      original_paragraph: (v.example_en || v.original_paragraph || v.example || v.sentence || '').trim(),
      paragraph_vi: (v.example_vi || v.paragraph_vi || v.translation_vi || v.translation || '').trim()
    }));
}

/**
 * Normalizes articles, ensuring raw JSON payloads (from n8n or AI) are unpacked into clean articles.
 */
function normalizeNewsArticles(articles) {
  const result = [];

  for (const item of articles) {
    let summaryEn = (item.summary_en || '').trim();
    let summaryVi = (item.summary_vi || '').trim();
    let vocabList = extractVocabulary(item.vocab_json);

    let cleanJsonStr = summaryEn.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

    if (cleanJsonStr.startsWith('{') || cleanJsonStr.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed && typeof parsed === 'object') {
          // Check for article summaries list under various common keys
          const subArticles = Array.isArray(parsed.article_summaries) ? parsed.article_summaries
            : Array.isArray(parsed.articles) ? parsed.articles
            : Array.isArray(parsed.news) ? parsed.news
            : Array.isArray(parsed.summaries) ? parsed.summaries
            : Array.isArray(parsed.items) ? parsed.items
            : null;

          // Check for vocabulary inside the parsed JSON
          const innerVocab = extractVocabulary(parsed);
          if (innerVocab.length > 0) {
            vocabList = innerVocab;
          }

          if (subArticles && subArticles.length > 0) {
            const sharedVocabJson = JSON.stringify(vocabList);

            subArticles.forEach((art, idx) => {
              result.push({
                id: `${item.id}_${art.id || idx + 1}`,
                headline: art.title || art.headline || art.name || item.headline,
                category: art.category || item.category || 'Tin Tức Thế Giới - BBC News',
                source_name: item.source_name || 'BBC News',
                source_url: art.link || art.url || art.source_url || item.source_url || 'https://www.bbc.co.uk/news/world',
                summary_en: art.summary_en || art.summary_english || art.summary || art.content_en || '',
                summary_vi: art.summary_vi || art.summary_vietnamese || art.content_vi || '',
                vocab_json: sharedVocabJson,
                created_at: item.created_at
              });
            });
            continue;
          } else {
            summaryEn = parsed.summary_en || parsed.summary_english || parsed.summary || summaryEn;
            summaryVi = parsed.summary_vi || parsed.summary_vietnamese || summaryVi;
          }
        }
      } catch (_) {
        summaryEn = cleanJsonStr;
      }
    }

    result.push({
      ...item,
      summary_en: summaryEn,
      summary_vi: summaryVi,
      vocab_json: JSON.stringify(vocabList)
    });
  }

  return result;
}

/**
 * GET /api/news - Fetch recent news articles from Supabase / Database (with 5-minute in-memory cache)
 */
async function getRecentNews(req, res) {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh) {
      const cached = cache.get('recent_news_articles');
      if (cached) {
        return res.json(cached);
      }
    }

    const rawArticles = await dbQueryAll(
      `SELECT id, headline, category, source_name, source_url, summary_en, summary_vi, vocab_json, created_at
       FROM news_articles
       ORDER BY created_at DESC
       LIMIT 30`
    );
    const cleanedArticles = normalizeNewsArticles(rawArticles).slice(0, 30);

    const payload = {
      success: true,
      count: cleanedArticles.length,
      data: cleanedArticles
    };

    cache.set('recent_news_articles', payload, 300); // 5 minutes TTL

    return res.json(payload);
  } catch (err) {
    console.error('[News Controller] Error fetching news:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getRecentNews };



