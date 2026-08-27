const express = require('express');
const router = express.Router();
const wordsController = require('../controllers/words.controller');
const { getRecentNews } = require('../controllers/news.controller');
const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/words', wordsController.getWords);
router.post('/words/save', requireAuth, wordsController.saveWord);
router.get('/stats', optionalAuth, wordsController.getStats);
router.get('/news', getRecentNews);

module.exports = router;

