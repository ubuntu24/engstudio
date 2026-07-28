const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practice.controller');

router.post('/realtime_check', practiceController.realtimeCheck);
router.post('/check', practiceController.check);

module.exports = router;
