const { dbQueryAll } = require('../utils/db');
const cache = require('../utils/cache');

/**
 * Normalizes articles, ensuring raw JSON payloads are unpacked into clean articles.
 */
function normalizeNewsArticles(articles) {
  const result = [];

  for (const item of articles) {
    let summaryEn = (item.summary_en || '').trim();
    let summaryVi = (item.summary_vi || '').trim();
    let vocabJson = item.vocab_json || '[]';

    let cleanJsonStr = summaryEn.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

    if (cleanJsonStr.startsWith('{') || cleanJsonStr.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed && Array.isArray(parsed.articles) && parsed.articles.length > 0) {
          const sharedVocab = JSON.stringify(parsed.vocabulary || []);

          parsed.articles.forEach((art, idx) => {
            result.push({
              id: `${item.id}_${idx + 1}`,
              headline: art.title || art.headline || item.headline,
              category: item.category || 'Tin Tức Thế Giới - BBC News',
              source_name: item.source_name || 'BBC News',
              source_url: art.url || art.source_url || item.source_url || 'https://www.bbc.co.uk/news/world',
              summary_en: art.summary_en || art.summary_english || art.summary || '',
              summary_vi: art.summary_vi || art.summary_vietnamese || '',
              vocab_json: sharedVocab,
              created_at: item.created_at
            });
          });
          continue;
        } else if (parsed && typeof parsed === 'object') {
          summaryEn = parsed.summary_en || parsed.summary_english || parsed.summary || summaryEn;
          summaryVi = parsed.summary_vi || parsed.summary_vietnamese || summaryVi;
          if (parsed.vocabulary) {
            vocabJson = JSON.stringify(parsed.vocabulary);
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
      vocab_json: vocabJson
    });
  }

  return result;
}

/**
 * GET /api/news - Fetch 10 most recent news articles from Supabase / Database (with 5-minute in-memory cache)
 */
async function getRecentNews(req, res) {
  try {
    const cached = cache.get('recent_news_articles');
    if (cached) {
      return res.json(cached);
    }

    const rawArticles = await dbQueryAll(
      `SELECT id, headline, category, source_name, source_url, summary_en, summary_vi, vocab_json, created_at
       FROM news_articles
       ORDER BY created_at DESC
       LIMIT 20`
    );
    const cleanedArticles = normalizeNewsArticles(rawArticles).slice(0, 10);

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


