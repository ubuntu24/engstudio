const { verifyToken } = require('../utils/auth');

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.auth_token;
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

function optionalAuth(req, res, next) {
  const token = req.cookies && req.cookies.auth_token;
  const userId = verifyToken(token);
  req.userId = userId || null;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
