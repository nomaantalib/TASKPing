const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

router.get('/', protect, scheduleController.getSchedule);
router.post('/generate', protect, scheduleController.generateSchedule);
router.post('/save', protect, scheduleController.saveSchedule);

module.exports = router;
