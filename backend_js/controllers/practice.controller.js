const { cleanText } = require('../utils/helpers');

function realtimeCheck(req, res) {
  const { user_input, target_text } = req.body || {};
  if (!user_input || !target_text) {
    return res.status(400).json({ error: 'Vui lòng cung cấp cả user_input và target_text' });
  }

  // Tokenize & normalize
  const normalize = str => str.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(Boolean);
  const userWords = normalize(user_input);
  const targetWords = normalize(target_text);

  // CRITICAL RULE (AGENTS.md): Use Word Frequency Counter map (Counter logic), NOT set membership!
  const targetCounts = {};
  targetWords.forEach(w => targetCounts[w] = (targetCounts[w] || 0) + 1);

  const userCounts = {};
  userWords.forEach(w => userCounts[w] = (userCounts[w] || 0) + 1);

  let correctCount = 0;
  Object.keys(userCounts).forEach(w => {
    if (targetCounts[w]) {
      correctCount += Math.min(userCounts[w], targetCounts[w]);
    }
  });

  const accuracy = targetWords.length ? Math.round((correctCount / targetWords.length) * 100) : 0;
  const isMatch = user_input.trim().toLowerCase() === target_text.trim().toLowerCase();

  res.json({
    accuracy,
    is_match: isMatch,
    target_count: targetWords.length,
    user_count: userWords.length,
    matched_words: correctCount,
  });
}

function check(req, res) {
  const { user_input, target_text } = req.body || {};
  const isCorrect = cleanText(user_input).toLowerCase() === cleanText(target_text).toLowerCase();
  res.json({
    is_correct: isCorrect,
    feedback: isCorrect ? 'Chính xác!' : `Gợi ý đáp án: ${target_text}`,
  });
}

function getTopics(req, res) {
  res.json({
    topics: [
      { id: 1, name: 'Giao tiếp hàng ngày (Daily Conversation)', level: 'A2' },
      { id: 2, name: 'Công việc & Phỏng vấn (Job Interview)', level: 'B1' },
      { id: 3, name: 'Du lịch & Khám phá (Travel)', level: 'A2' },
    ]
  });
}

module.exports = {
  realtimeCheck,
  check,
  getTopics
};
