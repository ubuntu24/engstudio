const express = require('express');
const router = express.Router();
const { proxyToAIService } = require('../middlewares/proxy.middleware');
const { aiLimiter } = require('../middlewares/rateLimiter.middleware');

const { apiLimiter } = require('../middlewares/rateLimiter.middleware');
const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware');

router.post('/translate', requireAuth, aiLimiter, (req, res) => proxyToAIService(req, res, '/translate'));
router.post('/correct', requireAuth, aiLimiter, (req, res) => proxyToAIService(req, res, '/correct'));
router.all('/video/*', optionalAuth, aiLimiter, (req, res) => proxyToAIService(req, res));
router.get('/grammar/questions', apiLimiter, (req, res) => proxyToAIService(req, res));
router.post('/grammar/ai_explain', requireAuth, aiLimiter, (req, res) => proxyToAIService(req, res));
router.get('/ai/usage', optionalAuth, apiLimiter, (req, res) => proxyToAIService(req, res, '/api/ai/usage'));
router.post('/ai/generate-example', optionalAuth, aiLimiter, (req, res) => proxyToAIService(req, res, '/api/ai/generate-example'));
router.post('/practice/advanced_check', optionalAuth, aiLimiter, (req, res) => proxyToAIService(req, res, '/api/practice/advanced_check'));
router.get('/practice/topics', apiLimiter, (req, res) => proxyToAIService(req, res, '/api/practice/topics'));

module.exports = router;
