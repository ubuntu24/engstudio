const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'english-vault-secret-key-dev-only';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(userId) {
  const sig = crypto.createHash('sha256').update(`${userId}-${SECRET}`).digest('hex');
  return `user-${userId}-${sig}`;
}

function verifyToken(token) {
  if (!token || !token.startsWith('user-')) return null;
  const parts = token.split('-');
  if (parts.length !== 3) return null;
  const userId = parseInt(parts[1], 10);
  const sig = parts[2];
  const expectedSig = crypto.createHash('sha256').update(`${userId}-${SECRET}`).digest('hex');
  if (sig === expectedSig) return userId;
  return null;
}

module.exports = {
  hashPassword,
  generateToken,
  verifyToken
};
