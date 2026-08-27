const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practice.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

router.post('/realtime_check', optionalAuth, practiceController.realtimeCheck);
router.post('/check', optionalAuth, practiceController.check);

module.exports = router;

