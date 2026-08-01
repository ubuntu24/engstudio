const { dbQueryAll, dbQueryGet, dbRun } = require('../utils/db');
const { escapeHtml } = require('../utils/helpers');

const reviewLocks = new Set();

async function getProgress(req, res) {
  try {
    if (!req.userId) {
      return res.json({
        learning: 0,
        reviewing: 0,
        known: 0,
        due_now: 0,
        total_learned: 0,
        is_guest: true
      });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const learningRow = await dbQueryGet("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1 AND status = 'learning'", [req.userId]);
    const reviewingRow = await dbQueryGet("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1 AND status = 'reviewing'", [req.userId]);
    const knownRow = await dbQueryGet("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1 AND status = 'known'", [req.userId]);
    
    const learning = learningRow ? parseInt(learningRow.c, 10) : 0;
    const reviewing = reviewingRow ? parseInt(reviewingRow.c, 10) : 0;
    const known = knownRow ? parseInt(knownRow.c, 10) : 0;

    const dueRow = await dbQueryGet(
      "SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1 AND due_date <= $2 AND status IN ('learning', 'reviewing', 'known')",
      [req.userId, nowStr]
    );
    const due_now = dueRow ? parseInt(dueRow.c, 10) : 0;

    res.json({
      learning,
      reviewing,
      known,
      due_now,
      total_learned: learning + reviewing + known,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTopics(req, res) {
  try {
    const totalRow = await dbQueryGet('SELECT COUNT(*) as c FROM vocabulary');
    const topicRows = await dbQueryAll(
      "SELECT topic, COUNT(*) as c FROM vocabulary WHERE topic IS NOT NULL AND topic != '' GROUP BY topic ORDER BY c DESC"
    );

    const topics = [
      { name: 'Tất cả', count: totalRow ? parseInt(totalRow.c, 10) : 0 },
      ...topicRows.map(r => ({ name: r.topic, count: parseInt(r.c, 10) }))
    ];

    res.json({ topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createSession(req, res) {
  try {
    const data = req.method === 'POST' ? req.body : req.query;
    let count = parseInt(data.count || 20);
    count = Math.max(1, Math.min(count, 50));
    const topicRaw = (data.topic || '').trim();
    const topic = topicRaw;
    const videoOnly = data.video_only === true || data.video_only === 'true';

    if (!req.userId) {
      let guestSql = `SELECT v.* FROM vocabulary v`;
      let guestParams = [];
      if (topic && topic !== 'all' && topic !== 'Tất cả') {
        guestParams.push(topic);
        guestSql += ` WHERE v.topic = $${guestParams.length}`;
      }
      if (videoOnly) {
        guestSql += guestSql.includes('WHERE') ? ` AND v.video_id IS NOT NULL AND v.video_id != ''` : ` WHERE v.video_id IS NOT NULL AND v.video_id != ''`;
      }
      guestParams.push(count);
      guestSql += ` ORDER BY RANDOM() LIMIT $${guestParams.length}`;
      const cards = await dbQueryAll(guestSql, guestParams);
      return res.json({
        session_id: 0,
        cards: cards,
        new_count: cards.length,
        review_count: 0,
        topic: topic || 'Tất cả',
        is_guest: true
      });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let dueSql = `
      SELECT v.* FROM vocabulary v
      JOIN learning_progress lp ON lp.word_id = v.id
      WHERE lp.user_id = $1 AND lp.due_date <= $2 AND lp.status IN ('learning', 'reviewing', 'known')
    `;
    let dueParams = [req.userId, nowStr];

    let newSql = `
      SELECT v.* FROM vocabulary v
      WHERE v.id NOT IN (SELECT word_id FROM learning_progress WHERE user_id = $1)
    `;
    let newParams = [req.userId];

    if (topic && topic !== 'all' && topic !== 'Tất cả') {
      dueParams.push(topic);
      dueSql += ` AND v.topic = $${dueParams.length}`;
      newParams.push(topic);
      newSql += ` AND v.topic = $${newParams.length}`;
    }
    
    if (videoOnly) {
      dueSql += ` AND v.video_id IS NOT NULL AND v.video_id != ''`;
      newSql += ` AND v.video_id IS NOT NULL AND v.video_id != ''`;
    }

    dueParams.push(count);
    dueSql += ` ORDER BY lp.due_date ASC LIMIT $${dueParams.length}`;

    const dueRows = await dbQueryAll(dueSql, dueParams);

    let newRows = [];
    const remaining = count - dueRows.length;
    if (remaining > 0) {
      newParams.push(remaining);
      newSql += ` ORDER BY RANDOM() LIMIT $${newParams.length}`;
      newRows = await dbQueryAll(newSql, newParams);
    }

    const cards = [...dueRows, ...newRows].sort(() => 0.5 - Math.random());

    const sessionRes = await dbRun(
      "INSERT INTO review_sessions (user_id, session_type, cards_seen, cards_correct) VALUES ($1, 'learn', 0, 0) RETURNING id",
      [req.userId]
    );

    res.json({
      session_id: sessionRes.lastID,
      cards: cards,
      new_count: newRows.length,
      review_count: dueRows.length,
      topic: topic || 'Tất cả',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function submitReview(req, res) {
  try {
    const { word_id, rating, session_id, time_spent_ms } = req.body || {};
    if (!word_id || typeof word_id !== 'number' || !Number.isInteger(word_id) || word_id < 1) {
      return res.status(400).json({ error: 'word_id không hợp lệ' });
    }
    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return res.status(400).json({ error: 'rating không hợp lệ' });
    }

    // Validate word_id tồn tại trong vocabulary (chống IDOR)
    const wordExists = await dbQueryGet('SELECT id FROM vocabulary WHERE id = $1', [word_id]);
    if (!wordExists) {
      return res.status(404).json({ error: 'Từ vựng không tồn tại' });
    }

    if (!req.userId) {
      return res.json({
        ok: true,
        correct: ['good', 'easy'].includes(rating),
        status: 'learning',
        interval_days: 0,
        due_date: new Date().toISOString(),
        is_guest: true
      });
    }

    const lockKey = `${req.userId}:${word_id}`;
    if (reviewLocks.has(lockKey)) {
      return res.status(429).json({ error: 'Đang xử lý yêu cầu' });
    }
    reviewLocks.add(lockKey);

    try {
      const now = new Date();
      const nowStr = now.toISOString().replace('T', ' ').slice(0, 19);

    const row = await dbQueryGet('SELECT * FROM learning_progress WHERE user_id = $1 AND word_id = $2', [req.userId, word_id]);

    let ease = row ? parseFloat(row.ease_factor || 2.5) : 2.5;
    let interval = row ? parseFloat(row.interval_days || 0) : 0;
    let consecutive = row ? parseInt(row.consecutive_correct || 0) : 0;
    let totalReviews = row ? parseInt(row.total_reviews || 0) + 1 : 1;

    let status = 'learning';

    // SRS calculation
    if (rating === 'again') {
      ease = Math.max(1.3, ease - 0.2);
      interval = 0;
      consecutive = 0;
      status = 'learning';
    } else if (rating === 'hard') {
      ease = Math.max(1.3, ease - 0.15);
      consecutive += 1;
      interval = interval < 1 ? 1 : interval * 1.2;
      status = consecutive < 2 ? 'learning' : 'reviewing';
    } else if (rating === 'good') {
      consecutive += 1;
      if (interval < 1) interval = 1;
      else if (interval < 6) interval = 6;
      else interval *= ease;
      status = consecutive < 4 ? 'reviewing' : 'known';
    } else { // easy
      ease += 0.15;
      consecutive += 1;
      if (interval < 1) interval = 2;
      else interval *= ease * 1.3;
      status = consecutive >= 3 ? 'known' : 'reviewing';
    }

    const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    const dueStr = dueDate.toISOString().replace('T', ' ').slice(0, 19);

    if (row) {
      await dbRun(
        `UPDATE learning_progress
         SET status = $1, ease_factor = $2, interval_days = $3, consecutive_correct = $4,
             due_date = $5, last_reviewed = $6, total_reviews = $7, updated_at = $8
         WHERE user_id = $9 AND word_id = $10`,
        [status, ease, interval, consecutive, dueStr, nowStr, totalReviews, nowStr, req.userId, word_id]
      );
    } else {
      await dbRun(
        `INSERT INTO learning_progress
         (user_id, word_id, status, ease_factor, interval_days, consecutive_correct,
          due_date, last_reviewed, total_reviews, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [req.userId, word_id, status, ease, interval, consecutive, dueStr, nowStr, totalReviews, nowStr, nowStr]
      );
    }

    await dbRun(
      `INSERT INTO review_log (session_id, user_id, word_id, rating, response_time_ms, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id || null, req.userId, word_id, rating, time_spent_ms || 0, nowStr]
    );

    let baseXp = 0;
    if (rating === 'good') baseXp = 10;
    else if (rating === 'easy') baseXp = 12;
    else if (rating === 'hard') baseXp = 5;
    else if (rating === 'again') baseXp = 1;

    let xpAdded = 0;
    let limitReached = false;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const userRow = await dbQueryGet('SELECT xp, flashcard_xp_today, last_flashcard_date FROM users WHERE id = $1', [req.userId]);
      if (userRow) {
        let xpToday = userRow.flashcard_xp_today || 0;
        const lastDate = userRow.last_flashcard_date;
        
        if (lastDate !== todayStr) {
          xpToday = 0;
        }

        if (xpToday >= 500) {
          limitReached = true;
          xpAdded = 0;
        } else {
          xpAdded = Math.min(baseXp, 500 - xpToday);
          xpToday += xpAdded;
        }

        const newXp = (userRow.xp || 0) + xpAdded;
        const newLevel = Math.floor(newXp / 100) + 1;
        await dbRun('UPDATE users SET xp = $1, level = $2, flashcard_xp_today = $3, last_flashcard_date = $4 WHERE id = $5', [newXp, newLevel, xpToday, todayStr, req.userId]);

        // Badge Awarding Logic
        const existingBadges = await dbQueryAll('SELECT badge_id FROM user_badges WHERE user_id = $1', [req.userId]);
        const ownedBadges = new Set(existingBadges.map(b => b.badge_id));
        
        let earnedBadges = [];
        if (newLevel >= 2 && !ownedBadges.has('flashcard_novice')) {
          await dbRun('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [req.userId, 'flashcard_novice']);
          earnedBadges.push({ id: 'flashcard_novice', name: 'Tân binh Flashcard', description: 'Đạt Cấp 2 trong hệ thống Flashcard' });
        }
        if (newLevel >= 5 && !ownedBadges.has('flashcard_pro')) {
          await dbRun('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [req.userId, 'flashcard_pro']);
          earnedBadges.push({ id: 'flashcard_pro', name: 'Chuyên gia Flashcard', description: 'Đạt Cấp 5 trong hệ thống Flashcard' });
        }
        
        res.locals.earnedBadges = earnedBadges;
      }
    } catch (e) {
      console.error('Error updating XP or Badges:', e);
    }

    res.json({
      ok: true,
      correct: ['good', 'easy'].includes(rating),
      status,
      interval_days: interval,
      due_date: dueStr,
      xp_added: xpAdded,
      limit_reached: limitReached,
      earned_badges: res.locals?.earnedBadges || []
    });
    } finally {
      reviewLocks.delete(lockKey);
    }
  } catch (err) {
    console.error('[Learn submitReview Error]:', err);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : err.message });
  }
}

module.exports = {
  getProgress,
  getTopics,
  createSession,
  submitReview
};
