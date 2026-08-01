const { dbQueryAll, dbQueryGet, dbRun } = require('../utils/db');

async function generateQuiz(req, res) {
  try {
    let count = parseInt(req.body?.count || 10);
    count = Math.max(1, Math.min(count, 50));
    const mode = req.body?.mode || 'review';

    let words = [];

    if (mode === 'review' && req.userId) {
      words = await dbQueryAll(
        `SELECT v.* FROM vocabulary v
         JOIN learning_progress lp ON lp.word_id = v.id
         WHERE lp.user_id = ? AND v.vietnamese_meaning IS NOT NULL AND TRIM(v.vietnamese_meaning) != ''
         ORDER BY RANDOM()
         LIMIT ?`,
        [req.userId, count]
      );

      if (words.length < count) {
        const existingIds = words.map(w => w.id);
        const remaining = count - words.length;
        const placeholders = existingIds.length ? existingIds.map(() => '?').join(',') : '-1';
        const extraWords = await dbQueryAll(
          `SELECT * FROM vocabulary
           WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) != ''
           AND id NOT IN (${placeholders})
           ORDER BY RANDOM()
           LIMIT ?`,
          [...existingIds, remaining]
        );
        words = [...words, ...extraWords];
      }
    } else {
      words = await dbQueryAll(
        `SELECT * FROM vocabulary
         WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) != ''
         ORDER BY RANDOM()
         LIMIT ?`,
        [count]
      );
    }

    if (!words.length) {
      return res.json({ questions: [], error: 'Không có từ nào trong danh sách' });
    }

    const allRows = await dbQueryAll(
      "SELECT vietnamese_meaning FROM vocabulary WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) != ''"
    );
    const allMeanings = allRows.map(r => r.vietnamese_meaning);

    const questions = words.map(w => {
      const correct = w.vietnamese_meaning;
      const distractors = allMeanings.filter(m => m !== correct).sort(() => 0.5 - Math.random());
      const options = [correct, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      return {
        id: w.id,
        type: 'mcq',
        word: w.word,
        options,
        answer: correct,
      };
    });

    res.json({ questions });
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
      const correct = row.vietnamese_meaning === answer;

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
  generateQuiz,
  submitQuiz
};
