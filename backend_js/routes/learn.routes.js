const express = require('express');
const router = express.Router();
const learnController = require('../controllers/learn.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');
const { sessionLimiter, reviewLimiter } = require('../middlewares/rateLimiter.middleware');

router.get('/progress', optionalAuth, learnController.getProgress);
router.get('/topics', learnController.getTopics);
router.all('/session', optionalAuth, sessionLimiter, learnController.createSession);
router.post('/review', optionalAuth, reviewLimiter, learnController.submitReview);

module.exports = router;
