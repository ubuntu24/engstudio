require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.disable('x-powered-by');
// Trust Cloudflare proxy (required for express-rate-limit and correct IP detection)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

// Security Headers & CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_API_URL,
  'https://www.engstudio.dpdns.org',
  'https://engstudio.dpdns.org',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.47:3000',
  'http://frontend:3000',
].filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any origin in allowedOrigins list
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    // Allow any *.dpdns.org or *.ngrok.io in development
    if (/\.(dpdns\.org|ngrok\.io|trycloudflare\.com)$/.test(origin)) return callback(null, true);
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true
}));

// Rate Limiters (after trust proxy is set)
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
app.use('/api/', apiLimiter);

// Simple Cookie Parser Middleware
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      req.cookies[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }
  next();
});

// Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Import Routes
const authRoutes = require('./routes/auth.routes');
const wordsRoutes = require('./routes/words.routes');
const learnRoutes = require('./routes/learn.routes');
const quizRoutes = require('./routes/quiz.routes');
const practiceRoutes = require('./routes/practice.routes');
const proxyRoutes = require('./routes/proxy.routes');

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api', wordsRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api', proxyRoutes); // Proxy routes include /api/video, /api/grammar, etc.
app.use('/', proxyRoutes); // Proxy routes include /translate, /correct

// Health check endpoint (for K8s liveness & readiness probes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-js', timestamp: new Date().toISOString() });
});

// Global Error Handler — ngăn stack trace bị lộ ra client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Lỗi hệ thống, vui lòng thử lại sau.' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [backend_core] Modular Express API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 AI Requests will proxy to Python Worker at ${AI_SERVICE_URL}`);
  console.log(`=======================================================`);
});
