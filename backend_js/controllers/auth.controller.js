const { dbQueryGet, dbRun, dbQueryAll } = require('../utils/db');
const { hashPassword, generateToken, verifyPassword } = require('../utils/auth');
const { escapeHtml } = require('../utils/helpers');
const { blacklistToken } = require('../middlewares/auth.middleware');

async function register(req, res) {
  try {
    let { username, password, display_name } = req.body || {};
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Đầu vào không hợp lệ' });
    }
    if (display_name && typeof display_name !== 'string') {
      return res.status(400).json({ error: 'Đầu vào không hợp lệ' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải dài ít nhất 8 ký tự' });
    }
    username = escapeHtml(username).trim();
    display_name = escapeHtml(display_name || username).trim();
    
    const existing = await dbQueryGet('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(400).json({ error: 'Đăng ký không thành công. Tên đăng nhập không hợp lệ hoặc đã tồn tại.' });
    
    const hashed = await hashPassword(password);
    const result = await dbRun('INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id', [username, hashed, display_name]);
    
    const userId = result.lastID;
    const token = generateToken(userId);
    
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('username', username, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    
    res.json({ ok: true, user: { id: userId, username, display_name } });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : err.message });
  }
}

async function login(req, res) {
  try {
    let { username, password } = req.body || {};
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Đầu vào không hợp lệ' });
    }
    
    username = escapeHtml(username).trim();
    const user = await dbQueryGet('SELECT id, username, password_hash, display_name FROM users WHERE username = $1', [username]);
    
    const { valid, needsRehash } = await verifyPassword(password, user ? user.password_hash : null);
    if (!user || !valid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    // Seamless migration: rehash legacy SHA-256 password to bcrypt on successful login
    if (needsRehash) {
      try {
        const newHash = await hashPassword(password);
        await dbRun('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      } catch (rehashErr) {
        console.error('[Auth] Failed to rehash legacy password:', rehashErr);
      }
    }
    
    const token = generateToken(user.id);
    
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('username', user.username, { httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    
    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : err.message });
  }
}

function logout(req, res) {
  const token = req.cookies && req.cookies.auth_token;
  if (token) {
    blacklistToken(token);
  }
  res.clearCookie('auth_token');
  res.clearCookie('username');
  res.json({ ok: true });
}

async function getMe(req, res) {
  try {
    const user = await dbQueryGet('SELECT id, username, display_name, xp, level FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const badgeRows = await dbQueryAll('SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC', [req.userId]);
    user.badges = badgeRows || [];
    res.json({ user });
  } catch (err) {
    console.error('[Auth getMe Error]:', err);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Lỗi hệ thống' : err.message });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
