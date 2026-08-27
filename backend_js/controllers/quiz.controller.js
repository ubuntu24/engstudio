const { dbQueryAll, dbQueryGet, dbRun } = require('../utils/db');
const cache = require('../utils/cache');

async function getQuizInfo(req, res) {
  try {
    const cacheKey = `quiz_info:${req.userId || 'guest'}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let totalRowPromise = dbQueryGet('SELECT COUNT(*) as c FROM vocabulary');
    let topicRowsPromise = dbQueryAll(
      "SELECT topic, COUNT(*) as c FROM vocabulary WHERE topic IS NOT NULL AND topic != '' GROUP BY topic ORDER BY c DESC"
    );

    let learnedRowPromise = req.userId 
      ? dbQueryGet('SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1', [req.userId])
      : Promise.resolve(null);

    let learnedTopicRowsPromise = req.userId
      ? dbQueryAll(
          `SELECT v.topic, COUNT(DISTINCT lp.word_id) as c
           FROM learning_progress lp
           JOIN vocabulary v ON v.id = lp.word_id
           WHERE lp.user_id = $1 AND v.topic IS NOT NULL AND v.topic != ''
           GROUP BY v.topic`,
          [req.userId]
        )
      : Promise.resolve([]);

    const [totalRow, topicRows, learnedRow, learnedTopicRows] = await Promise.all([
      totalRowPromise,
      topicRowsPromise,
      learnedRowPromise,
      learnedTopicRowsPromise
    ]);

    const totalVocabulary = totalRow ? parseInt(totalRow.c, 10) : 0;
    const totalLearned = learnedRow ? parseInt(learnedRow.c, 10) : 0;
    const learnedMap = {};
    (learnedTopicRows || []).forEach(r => {
      learnedMap[r.topic] = parseInt(r.c, 10) || 0;
    });

    const topics = [
      { name: 'All', display_name: 'Tất cả chủ đề', count: totalVocabulary, learned: totalLearned },
      ...topicRows.map(r => ({
        name: r.topic,
        display_name: r.topic,
        count: parseInt(r.c, 10),
        learned: learnedMap[r.topic] || 0
      }))
    ];

    const payload = {
      total_vocabulary: totalVocabulary,
      total_learned: totalLearned,
      topics,
      is_guest: !req.userId
    };

    cache.set(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function generateQuiz(req, res) {
  try {
    let count = parseInt(req.body?.count || 10);
    count = Math.max(1, Math.min(count, 50));
    const mode = req.body?.mode || 'review';
    const topic = req.body?.topic;

    let topicCond = '';
    let topicParams = [];
    if (topic && topic !== 'All' && topic !== 'Tất cả') {
      topicCond = ' AND v.topic = ?';
      topicParams.push(topic);
    }

    let words = [];

    if (mode === 'review') {
      if (!req.userId) {
        return res.status(401).json({
          questions: [],
          error: 'Vui lòng đăng nhập để ôn tập lại những từ bạn đã học.'
        });
      }

      // CHỈ LẤY CÁC TỪ MÀ USER ĐÃ HỌC TRONG TIẾN TRÌNH (learning_progress)
      words = await dbQueryAll(
        `SELECT v.* FROM vocabulary v
         JOIN learning_progress lp ON lp.word_id = v.id
         WHERE lp.user_id = ? AND v.vietnamese_meaning IS NOT NULL AND TRIM(v.vietnamese_meaning) != ''
         ${topicCond}
         ORDER BY RANDOM()
         LIMIT ?`,
        [req.userId, ...topicParams, count]
      );

      if (!words.length) {
        const topicMsg = (topic && topic !== 'All' && topic !== 'Tất cả') ? ` trong chủ đề "${topic}"` : '';
        return res.json({
          questions: [],
          total_learned: 0,
          error: `Bạn chưa có từ vựng nào đã học${topicMsg} để ôn tập. Hãy học từ mới ở phần Flashcard trước nhé!`
        });
      }
    } else {
      // mode === 'new': Kiểm tra từ mới trong kho
      words = await dbQueryAll(
        `SELECT * FROM vocabulary v
         WHERE v.vietnamese_meaning IS NOT NULL AND TRIM(v.vietnamese_meaning) != ''
         ${topicCond}
         ORDER BY RANDOM()
         LIMIT ?`,
        [...topicParams, count]
      );
    }

    if (!words.length) {
      return res.json({ questions: [], error: 'Không tìm thấy từ vựng nào trong chủ đề này.' });
    }

    const allRows = await dbQueryAll(
      "SELECT vietnamese_meaning FROM vocabulary WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) != ''"
    );
    const allMeanings = allRows.map(r => r.vietnamese_meaning).filter(Boolean);

    const questions = words.map(w => {
      const correct = w.vietnamese_meaning;
      const chosen = new Set([correct]);
      const distractors = [];
      let attempts = 0;
      while (distractors.length < 3 && attempts < 50 && allMeanings.length > 1) {
        attempts++;
        const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
        if (rand && !chosen.has(rand)) {
          chosen.add(rand);
          distractors.push(rand);
        }
      }
      const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
      return {
        id: w.id,
        type: 'mcq',
        word: w.word,
        topic: w.topic,
        options,
        answer: correct,
      };
    });

    res.json({
      questions,
      mode,
      total_questions: questions.length,
      topic: topic || 'All'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function submitQuiz(req, res) {
  try {
    const { id, word_id, answer, type } = req.body || {};
    const targetId = id || word_id;
    if (!targetId || !answer) return res.status(400).json({ error: 'Missing parameters' });

    if (type === 'grammar') {
      const row = await dbQueryGet(
        'SELECT correct_answer, explanation, formula, translation_vi, ai_breakdown_json FROM grammar_questions WHERE id = ?',
        [targetId]
      );
      if (!row) return res.status(404).json({ error: 'Grammar question not found' });
      
      const correct = row.correct_answer === answer;
      
      if (req.userId) {
        try {
          const userRow = await dbQueryGet('SELECT xp FROM users WHERE id = $1', [req.userId]);
          if (userRow) {
            const xpGain = correct ? 2 : -5;
            let newXp = (userRow.xp || 0) + xpGain;
            if (newXp < 0) newXp = 0;
            const newLevel = Math.floor(newXp / 100) + 1;
            await dbRun('UPDATE users SET xp = $1, level = $2 WHERE id = $3', [newXp, newLevel, req.userId]);
          }
        } catch (e) {
          console.error('Error updating Quiz XP:', e);
        }
      }
      
      let ai_analysis = null;
      if (row.ai_breakdown_json) {
        try {
          ai_analysis = JSON.parse(row.ai_breakdown_json);
        } catch (e) {}
      }
      
      return res.json({
        correct,
        correct_answer: row.correct_answer,
        explanation: row.explanation,
        formula: row.formula,
        translation_vi: row.translation_vi,
        ai_analysis
      });
    } else {
      const row = await dbQueryGet('SELECT vietnamese_meaning FROM vocabulary WHERE id = ?', [targetId]);
      if (!row) return res.status(404).json({ error: 'Word not found' });
      const correct = (row.vietnamese_meaning || '').trim().toLowerCase() === (answer || '').trim().toLowerCase();

      if (req.userId) {
        try {
          const userRow = await dbQueryGet('SELECT xp FROM users WHERE id = $1', [req.userId]);
          if (userRow) {
            const xpGain = correct ? 2 : -5;
            let newXp = (userRow.xp || 0) + xpGain;
            if (newXp < 0) newXp = 0;
            const newLevel = Math.floor(newXp / 100) + 1;
            await dbRun('UPDATE users SET xp = $1, level = $2 WHERE id = $3', [newXp, newLevel, req.userId]);
          }
        } catch (e) {
          console.error('Error updating Quiz XP:', e);
        }
      }

      res.json({ correct, correct_answer: row.vietnamese_meaning });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getQuizInfo,
  generateQuiz,
  submitQuiz
};

