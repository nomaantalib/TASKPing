const Schedule = require('../models/Schedule');
const Task = require('../models/Task');
const gemini = require('../services/gemini');

const getDateString = (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  return d.toISOString().slice(0, 10);
};

/**
 * Get daily schedule
 */
exports.getSchedule = async (req, res, next) => {
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
};

/**
 * Generate AI Schedule
 */
exports.generateSchedule = async (req, res, next) => {
  try {
    const date = req.body.date || getDateString();
    const userKey = req.user.geminiApiKey;
    const energyWindow = req.user.energyWindow || 'morning';

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

      pendingTasks = await Task.find({
        userId: req.user._id,
        status: 'pending'
      }).sort({ priorityScore: -1 });
    }

    const scheduleAIResult = await gemini.generateSchedule(pendingTasks, energyWindow, userKey);
    const aiBlocks = scheduleAIResult.blocks || [];

    const validBlocks = [];
    for (const block of aiBlocks) {
      const exists = pendingTasks.find(t => t._id.toString() === block.taskId);
      if (exists) {
        validBlocks.push({
          taskId: block.taskId,
          startTime: block.startTime,
          endTime: block.endTime
        });
      }
    }

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

    const populatedSchedule = await Schedule.findById(schedule._id).populate('blocks.taskId');
    res.json({ success: true, schedule: populatedSchedule });
  } catch (error) {
    next(error);
  }
};

/**
 * Save manual schedule overrides
 */
exports.saveSchedule = async (req, res, next) => {
  try {
    const { date, blocks } = req.body;

    if (!date || !blocks) {
      return res.status(400).json({ success: false, message: 'Please provide date and schedule blocks' });
    }

    const formattedDate = getDateString(date);

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
};
