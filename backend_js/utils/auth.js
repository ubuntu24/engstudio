const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'english-vault-secret-key-dev-only';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(userId) {
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const sig = crypto.createHash('sha256').update(`${userId}-${exp}-${SECRET}`).digest('hex');
  return `user-${userId}-${exp}-${sig}`;
}

function verifyToken(token) {
  if (!token || !token.startsWith('user-')) return null;
  const parts = token.split('-');
  if (parts.length === 3) {
    // Old tokens without expiration - consider them expired for security
    return null;
  }
  if (parts.length !== 4) return null;
  const userId = parseInt(parts[1], 10);
  const exp = parseInt(parts[2], 10);
  const sig = parts[3];
  
  if (Date.now() > exp) return null;
  
  const expectedSig = crypto.createHash('sha256').update(`${userId}-${exp}-${SECRET}`).digest('hex');
  if (sig === expectedSig) return userId;
  return null;
}

module.exports = {
  hashPassword,
  generateToken,
  verifyToken
};
