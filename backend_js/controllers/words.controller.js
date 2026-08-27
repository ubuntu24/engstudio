const { dbQueryAll, dbQueryGet, dbRun } = require('../utils/db');
const { verifyToken } = require('../utils/auth');
const cache = require('../utils/cache');

async function getWords(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page || '50')));
    const search = (req.query.search || '').trim().toLowerCase();
    const sort = req.query.sort || 'az';
    const filter = req.query.filter || 'all';

    const cacheKey = `words_list:${page}:${perPage}:${search}:${sort}:${filter}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(LOWER(word) LIKE ? OR LOWER(vietnamese_meaning) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (filter === 'video') {
      conditions.push("video_id IS NOT NULL AND video_id != ''");
    } else if (filter === 'audio') {
      conditions.push("audio_path IS NOT NULL AND audio_path != ''");
    }

    const whereStr = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    let order = 'ORDER BY word ASC';
    if (sort === 'za') order = 'ORDER BY word DESC';
    else if (sort === 'video') order = "ORDER BY (CASE WHEN video_id IS NOT NULL AND video_id != '' THEN 0 ELSE 1 END), word ASC";

    const offset = (page - 1) * perPage;

    const [countRow, rows] = await Promise.all([
      dbQueryGet(`SELECT COUNT(*) as total FROM vocabulary ${whereStr}`, params),
      dbQueryAll(`SELECT * FROM vocabulary ${whereStr} ${order} LIMIT ? OFFSET ?`, [...params, perPage, offset])
    ]);

    const total = countRow ? parseInt(countRow.total, 10) : 0;

    const payload = {
      words: rows,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };

    cache.set(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function saveWord(req, res) {
  try {
    const { word, vietnamese, video_id, timestamp, video_title } = req.body || {};
    if (!word) return res.status(400).json({ error: 'Vui lòng cung cấp từ vựng' });

    const embed_url = video_id ? `https://www.youtube.com/embed/${video_id}?start=${Math.floor(timestamp || 0)}&autoplay=1` : '';
    const meaning = vietnamese || '';

    await dbRun(
      `INSERT INTO vocabulary (word, vietnamese_meaning, video_id, timestamp_sec, video_title, embed_url, context)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(word) DO UPDATE SET
         vietnamese_meaning = CASE WHEN excluded.vietnamese_meaning != '' THEN excluded.vietnamese_meaning ELSE vocabulary.vietnamese_meaning END,
         video_id = CASE WHEN excluded.video_id != '' THEN excluded.video_id ELSE vocabulary.video_id END,
         timestamp_sec = CASE WHEN excluded.video_id != '' THEN excluded.timestamp_sec ELSE vocabulary.timestamp_sec END,
         embed_url = CASE WHEN excluded.embed_url != '' THEN excluded.embed_url ELSE vocabulary.embed_url END`,
      [word, meaning, video_id || '', timestamp || 0, video_title || '', embed_url, `${word} (${meaning})`]
    );

    const row = await dbQueryGet('SELECT id FROM vocabulary WHERE word = ?', [word]);
    if (row) {
      await dbRun('INSERT OR IGNORE INTO learning_progress (user_id, word_id, status) VALUES (?, ?, \'new\')', [req.userId, row.id]);
    }
    
    cache.delPattern('user_stats');
    res.json({ ok: true, word });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getStats(req, res) {
  try {
    const extractDateString = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val.split('T')[0];
      if (val instanceof Date) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return String(val);
    };
    const token = req.cookies && req.cookies.auth_token;
    const userId = req.userId || verifyToken(token);
    const cacheKey = `user_stats:${userId || 'guest'}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    if (!userId) {
      const totalRow = await dbQueryGet('SELECT COUNT(*) as total FROM vocabulary');
      const total = totalRow ? parseInt(totalRow.total, 10) : 0;
      const guestPayload = {
        total_words: total,
        mastered_words: 0,
        learning_words: 0,
        review_due_count: 0,
        accuracy_rate: 0,
        streak_days: 0,
        chart_data: []
      };
      cache.set(cacheKey, guestPayload, 60);
      return res.json(guestPayload);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 4);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0] + ' 00:00:00';

    // Run all database queries in parallel
    const [
      totalRow,
      knownRow,
      learningRow,
      dueRow,
      totalReviewsRow,
      correctReviewsRow,
      streakRows,
      recentLogs
    ] = await Promise.all([
      dbQueryGet('SELECT COUNT(*) as total FROM vocabulary'),
      dbQueryGet("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ? AND status = 'known'", [userId]),
      dbQueryGet("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ? AND status IN ('learning', 'reviewing')", [userId]),
      dbQueryGet("SELECT COUNT(*) as due_today FROM learning_progress WHERE user_id = ? AND due_date <= ? AND status IN ('learning', 'reviewing', 'known')", [userId, nowStr]),
      dbQueryGet("SELECT COUNT(*) as c FROM review_log WHERE user_id = ?", [userId]),
      dbQueryGet("SELECT COUNT(*) as c FROM review_log WHERE user_id = ? AND rating IN ('good', 'easy')", [userId]),
      dbQueryAll("SELECT DISTINCT DATE(reviewed_at) as d FROM review_log WHERE user_id = ? ORDER BY d DESC LIMIT 30", [userId]),
      dbQueryAll("SELECT DATE(reviewed_at) as d, COUNT(*) as c FROM review_log WHERE user_id = ? AND reviewed_at >= ? GROUP BY d", [userId, fiveDaysAgoStr])
    ]);

    const total = totalRow ? parseInt(totalRow.total, 10) : 0;
    const mastered = knownRow ? parseInt(knownRow.c, 10) : 0;
    const learning = learningRow ? parseInt(learningRow.c, 10) : 0;
    const due_today = dueRow ? parseInt(dueRow.due_today, 10) : 0;

    // Accuracy Rate
    const totalReviews = totalReviewsRow ? parseInt(totalReviewsRow.c, 10) : 0;
    const correctReviews = correctReviewsRow ? parseInt(correctReviewsRow.c, 10) : 0;
    let accuracy_rate = 0;
    if (totalReviews > 0) {
      accuracy_rate = Math.round((correctReviews / totalReviews) * 100);
    }

    // Streak Days
    let streak_days = 0;
    if (streakRows && streakRows.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];
      
      let expectedDateStr = extractDateString(streakRows[0].d);
      
      if (expectedDateStr === today || expectedDateStr === yesterday) {
        streak_days = 1;
        let currentDate = new Date(expectedDateStr);
        for (let i = 1; i < streakRows.length; i++) {
          currentDate.setDate(currentDate.getDate() - 1);
          const prevDayStr = currentDate.toISOString().split('T')[0];
          const rowDateStr = extractDateString(streakRows[i].d);
          if (rowDateStr === prevDayStr) {
            streak_days++;
          } else {
            break;
          }
        }
      }
    }

    // Chart Data (last 5 days)
    const chartDataMap = {};
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      chartDataMap[dStr] = 0;
    }

    for (let row of (recentLogs || [])) {
      const dStr = extractDateString(row.d);
      if (chartDataMap[dStr] !== undefined) {
        chartDataMap[dStr] = parseInt(row.c, 10);
      }
    }

    const chart_data = Object.keys(chartDataMap).map(k => {
      const dateObj = new Date(k);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        date: `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`,
        count: chartDataMap[k]
      };
    });

    const payload = {
      total_words: total,
      mastered_words: mastered,
      learning_words: learning,
      review_due_count: due_today,
      accuracy_rate,
      streak_days,
      chart_data
    };

    cache.set(cacheKey, payload, 30); // 30s cache
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getWords,
  saveWord,
  getStats
};
