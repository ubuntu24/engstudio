const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// SECURITY FIX (vuln-0003): Removed hardcoded fallback secret.
// Application will fail to start if JWT_SECRET is not set in environment.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const SALT_ROUNDS = 10;

/**
 * SECURITY FIX (vuln-0008): Hash password using bcryptjs.
 * Returns a Promise.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * SECURITY FIX (vuln-0003): Generate a proper JWT using jsonwebtoken with HMAC-SHA256.
 */
function generateToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '24h', algorithm: 'HS256' });
}

/**
 * SECURITY FIX (vuln-0003): Verify a JWT.
 * Also supports the legacy custom token format for backward compatibility
 * during migration. Returns userId (number) or null.
 */
function verifyToken(token) {
  if (!token) return null;

  // Try standard JWT first
  if (!token.startsWith('user-')) {
    try {
      const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch (e) {
      return null;
    }
  }

  // Legacy custom token format — accept it but do NOT issue new ones.
  // This allows existing sessions to remain valid during the migration window.
  // Remove this block after all users have re-logged in.
  try {
    const parts = token.split('-');
    if (parts.length !== 4) return null;
    const userId = parseInt(parts[1], 10);
    const exp = parseInt(parts[2], 10);
    const sig = parts[3];
    if (isNaN(userId) || isNaN(exp)) return null;
    if (Date.now() > exp) return null;
    const expectedSig = crypto.createHash('sha256').update(`${userId}-${exp}-${SECRET}`).digest('hex');
    if (sig === expectedSig) return userId;
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Check password against stored hash.
 * Supports both new bcrypt hashes and legacy SHA-256 hashes (for migration).
 * Returns a Promise that resolves to { valid: bool, needsRehash: bool }.
 */
async function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return { valid: false, needsRehash: false };

  // Detect bcrypt hash by its prefix
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    const valid = await bcrypt.compare(plainPassword, storedHash);
    return { valid, needsRehash: false };
  }

  // Legacy SHA-256 hash (64 hex chars)
  const legacyHash = crypto.createHash('sha256').update(plainPassword).digest('hex');
  const valid = legacyHash === storedHash;
  return { valid, needsRehash: valid }; // If valid, signal that we should rehash to bcrypt
}

module.exports = {
  hashPassword,
  generateToken,
  verifyToken,
  verifyPassword,
};
