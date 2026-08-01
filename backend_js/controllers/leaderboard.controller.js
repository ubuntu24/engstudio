const { dbQueryAll } = require('../utils/db');

async function getLeaderboard(req, res) {
  try {
    const users = await dbQueryAll(
      "SELECT id, username, display_name, xp, level FROM users ORDER BY xp DESC LIMIT 50"
    );
    
    // Sanitize user data
    const sanitizedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.username,
      xp: u.xp || 0,
      level: u.level || 1
    }));
    
    res.json({ users: sanitizedUsers });
  } catch (err) {
    console.error('[Leaderboard getLeaderboard Error]:', err);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải bảng xếp hạng' });
  }
}

module.exports = {
  getLeaderboard
};
