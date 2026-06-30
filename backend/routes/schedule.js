const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const gemini = require('../services/gemini');

/**
 * Helper to get date string in YYYY-MM-DD format
 */
const getDateString = (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  return d.toISOString().slice(0, 10);
};

/**
 * @route   GET /api/schedule
 * @desc    Get user's schedule for a specific date (defaults to today)
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const date = req.query.date || getDateString();
    
    const schedule = await Schedule.findOne({
      userId: req.user._id,
      date: date
    }).populate('blocks.taskId');

    if (!schedule) {
      return res.json({ success: true, schedule: { date, blocks: [] } });
    }

    res.json({ success: true, schedule });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/schedule/generate
 * @desc    Generate AI schedule for today based on prioritized tasks & energy window
 * @access  Private
 */
router.post('/generate', protect, async (req, res, next) => {
  try {
    const date = req.body.date || getDateString();
    const userKey = req.user.geminiApiKey;
    const energyWindow = req.user.energyWindow || 'morning';

    // Fetch pending tasks for the user (only prioritize tasks that have a priority score > 0)
    let pendingTasks = await Task.find({
      userId: req.user._id,
      status: 'pending'
    }).sort({ priorityScore: -1 });

    if (pendingTasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending tasks available to schedule. Please add or prioritize some tasks first.'
      });
    }

    // If none of the tasks have been prioritized yet, run prioritization first
    const needsPrioritization = pendingTasks.every(t => t.priorityScore === 0);
    if (needsPrioritization) {
      const priorityUpdates = await gemini.prioritizeTasks(pendingTasks, userKey);
      const bulkOps = priorityUpdates.map(update => ({
        updateOne: {
          filter: { _id: update._id, userId: req.user._id },
          update: { 
            $set: { 
              priorityScore: update.priorityScore,
              aiReasoning: update.aiReasoning 
            }
          }
        }
      }));
      
      if (bulkOps.length > 0) {
        await Task.bulkWrite(bulkOps);
      }
      
      // Re-fetch
      pendingTasks = await Task.find({
        userId: req.user._id,
        status: 'pending'
      }).sort({ priorityScore: -1 });
    }

    // Call Gemini API to arrange time blocks
    const scheduleAIResult = await gemini.generateSchedule(pendingTasks, energyWindow, userKey);
    const aiBlocks = scheduleAIResult.blocks || [];

    // Filter blocks to ensure tasks actually belong to this user
    const validBlocks = [];
    for (const block of aiBlocks) {
      // Confirm the task exists for the user
      const exists = pendingTasks.find(t => t._id.toString() === block.taskId);
      if (exists) {
        validBlocks.push({
          taskId: block.taskId,
          startTime: block.startTime,
          endTime: block.endTime
        });
      }
    }

    // Update or create the schedule for this date
    let schedule = await Schedule.findOne({ userId: req.user._id, date });
    
    if (schedule) {
      schedule.blocks = validBlocks;
      await schedule.save();
    } else {
      schedule = await Schedule.create({
        userId: req.user._id,
        date,
        blocks: validBlocks
      });
    }

    // Populate task details for returning
    const populatedSchedule = await Schedule.findById(schedule._id).populate('blocks.taskId');

    res.json({ success: true, schedule: populatedSchedule });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/schedule/save
 * @desc    Manually save or update schedule blocks
 * @access  Private
 */
router.post('/save', protect, async (req, res, next) => {
  try {
    const { date, blocks } = req.body;

    if (!date || !blocks) {
      return res.status(400).json({ success: false, message: 'Please provide date and schedule blocks' });
    }

    const formattedDate = getDateString(date);

    // Validate that taskId matches user's tasks
    const validBlocks = [];
    for (const block of blocks) {
      const task = await Task.findOne({ _id: block.taskId, userId: req.user._id });
      if (task) {
        validBlocks.push({
          taskId: block.taskId,
          startTime: block.startTime,
          endTime: block.endTime
        });
      }
    }

    let schedule = await Schedule.findOne({ userId: req.user._id, date: formattedDate });
    if (schedule) {
      schedule.blocks = validBlocks;
      await schedule.save();
    } else {
      schedule = await Schedule.create({
        userId: req.user._id,
        date: formattedDate,
        blocks: validBlocks
      });
    }

    const populatedSchedule = await Schedule.findById(schedule._id).populate('blocks.taskId');
    res.json({ success: true, schedule: populatedSchedule });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
