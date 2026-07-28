const express = require('express');
const router = express.Router();
const { proxyToAIService } = require('../middlewares/proxy.middleware');
const { aiLimiter } = require('../middlewares/rateLimiter.middleware');

const { apiLimiter } = require('../middlewares/rateLimiter.middleware');

router.post('/translate', aiLimiter, (req, res) => proxyToAIService(req, res, '/translate'));
router.post('/correct', aiLimiter, (req, res) => proxyToAIService(req, res, '/correct'));
router.all('/video/*', aiLimiter, (req, res) => proxyToAIService(req, res));
router.get('/grammar/questions', apiLimiter, (req, res) => proxyToAIService(req, res));
router.post('/grammar/ai_explain', aiLimiter, (req, res) => proxyToAIService(req, res));
router.post('/practice/advanced_check', aiLimiter, (req, res) => proxyToAIService(req, res, '/api/practice/advanced_check'));
router.get('/practice/topics', apiLimiter, (req, res) => proxyToAIService(req, res, '/api/practice/topics'));

module.exports = router;
