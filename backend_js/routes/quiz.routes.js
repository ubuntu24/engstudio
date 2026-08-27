const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

router.get('/info', optionalAuth, quizController.getQuizInfo);
router.post('/generate', optionalAuth, quizController.generateQuiz);
router.post('/submit', optionalAuth, quizController.submitQuiz);

module.exports = router;

