const express = require('express');
const router = express.Router();
const learnController = require('../controllers/learn.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

router.get('/progress', optionalAuth, learnController.getProgress);
router.get('/topics', learnController.getTopics);
router.all('/session', optionalAuth, learnController.createSession);
router.post('/review', optionalAuth, learnController.submitReview);

module.exports = router;
