const { dbQueryGet, dbRun } = require('../utils/db');
const { hashPassword, generateToken } = require('../utils/auth');
const { escapeHtml } = require('../utils/helpers');

async function register(req, res) {
  try {
    let { username, password, display_name } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
    username = escapeHtml(username).trim();
    display_name = escapeHtml(display_name || username).trim();
    
    const existing = await dbQueryGet('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    
    const hashed = hashPassword(password);
    const result = await dbRun('INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id', [username, hashed, display_name]);
    
    const userId = result.lastID;
    const token = generateToken(userId);
    
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('username', username, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    
    res.json({ ok: true, user: { id: userId, username, display_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    let { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
    
    username = escapeHtml(username).trim();
    const user = await dbQueryGet('SELECT id, username, password_hash, display_name FROM users WHERE username = $1', [username]);
    
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }
    
    const token = generateToken(user.id);
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('username', user.username, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    
    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function logout(req, res) {
  res.clearCookie('auth_token');
  res.clearCookie('username');
  res.json({ ok: true });
}

async function getMe(req, res) {
  try {
    const user = await dbQueryGet('SELECT id, username, display_name FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
