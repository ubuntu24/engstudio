const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practice.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/realtime_check', requireAuth, practiceController.realtimeCheck);
router.post('/check', requireAuth, practiceController.check);

module.exports = router;
