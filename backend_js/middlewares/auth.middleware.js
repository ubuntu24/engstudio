const { verifyToken } = require('../utils/auth');

const blacklistedTokens = new Set();

function blacklistToken(token) {
  if (token) blacklistedTokens.add(token);
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.auth_token;
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

function optionalAuth(req, res, next) {
  const token = req.cookies && req.cookies.auth_token;
  if (blacklistedTokens.has(token)) {
    req.userId = null;
    return next();
  }
  const userId = verifyToken(token);
  req.userId = userId || null;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  blacklistToken
};
