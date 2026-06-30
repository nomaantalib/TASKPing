const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.get('/', protect, taskController.getTasks);
router.post('/', protect, taskController.createTask);
router.post('/nl-add', protect, taskController.createTaskNL);
router.put('/:id', protect, taskController.updateTask);
router.delete('/:id', protect, taskController.deleteTask);
router.post('/prioritize', protect, taskController.prioritize);
router.get('/nudge', protect, taskController.getNudge);
router.get('/briefing', protect, taskController.getBriefing);

module.exports = router;
