const express = require('express');
const router = express.Router();
const wordsController = require('../controllers/words.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/words', wordsController.getWords);
router.post('/words/save', requireAuth, wordsController.saveWord);
router.get('/stats', wordsController.getStats);

module.exports = router;
