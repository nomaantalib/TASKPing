const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const gemini = require('../services/gemini');
const vectorStore = require('../services/vectorStore');

/**
 * @route   GET /api/tasks
 * @desc    Get all user tasks (with optional RAG semantic search query 'q')
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    const tasks = await Task.find({ userId: req.user._id }).sort({ deadline: 1 });

    if (q && q.trim() !== '') {
      const userKey = req.user.geminiApiKey;
      // Get query embedding
      const queryEmbedding = await gemini.getEmbedding(q, userKey);
      // Retrieve top 5 most similar tasks
      const filteredTasks = vectorStore.searchSimilarTasks(tasks, queryEmbedding, 5);
      return res.json({ success: true, tasks: filteredTasks });
    }

    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, deadline, estimatedEffort, category, isRecurring } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Please provide a title and deadline' });
    }

    const userKey = req.user.geminiApiKey;
    const taskText = `${title} ${description || ''}`;
    const embedding = await gemini.getEmbedding(taskText, userKey);

    const task = await Task.create({
      userId: req.user._id,
      title,
      description,
      deadline,
      estimatedEffort: estimatedEffort || 1,
      category: category || 'Work',
      isRecurring: isRecurring || false,
      embedding
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks/nl-add
 * @desc    Add task using Natural Language parsing
 * @access  Private
 */
router.post('/nl-add', protect, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'No input text provided' });
    }

    const userKey = req.user.geminiApiKey;

    // Parse NL input into fields
    const parsedFields = await gemini.parseNLTask(text, userKey);

    // Generate embedding for parsed task
    const taskText = `${parsedFields.title} ${parsedFields.description || ''}`;
    const embedding = await gemini.getEmbedding(taskText, userKey);

    // Create task
    const task = await Task.create({
      userId: req.user._id,
      title: parsedFields.title,
      description: parsedFields.description,
      deadline: new Date(parsedFields.deadline),
      estimatedEffort: parsedFields.estimatedEffort || 1,
      category: parsedFields.category || 'Work',
      embedding
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { title, description, deadline, estimatedEffort, category, status, isRecurring } = req.body;
    
    let task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const userKey = req.user.geminiApiKey;

    // Calculate embedding if title or description changed
    if (title !== undefined || description !== undefined) {
      const updatedTitle = title !== undefined ? title : task.title;
      const updatedDesc = description !== undefined ? description : task.description;
      task.embedding = await gemini.getEmbedding(`${updatedTitle} ${updatedDesc}`, userKey);
    }

    // Handle habit streak tracking logic
    if (status !== undefined) {
      const oldStatus = task.status;
      task.status = status;
      
      if (status === 'completed') {
        task.completedAt = new Date();
        if (task.isRecurring && oldStatus !== 'completed') {
          task.streakCount += 1;
        }
      } else if (status === 'missed') {
        task.streakCount = 0;
      } else if (status === 'pending') {
        task.completedAt = undefined;
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (deadline !== undefined) task.deadline = deadline;
    if (estimatedEffort !== undefined) task.estimatedEffort = estimatedEffort;
    if (category !== undefined) task.category = category;
    if (isRecurring !== undefined) task.isRecurring = isRecurring;

    const updatedTask = await task.save();
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const result = await Task.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks/prioritize
 * @desc    Trigger AI Task Prioritization
 * @access  Private
 */
router.post('/prioritize', protect, async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    
    // Fetch pending tasks
    const pendingTasks = await Task.find({ userId: req.user._id, status: 'pending' });
    
    if (pendingTasks.length === 0) {
      return res.json({ success: true, message: 'No pending tasks to prioritize', tasks: [] });
    }

    // Call Gemini API to prioritize
    const priorityUpdates = await gemini.prioritizeTasks(pendingTasks, userKey);

    // Save priority score & reasoning updates to DB
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

    const updatedTasks = await Task.find({ userId: req.user._id });
    res.json({ success: true, tasks: updatedTasks });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/tasks/nudge
 * @desc    Get AI proactive progress reminder
 * @access  Private
 */
router.get('/nudge', protect, async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    const tasks = await Task.find({ userId: req.user._id });

    // Calculate stats
    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const missed = tasks.filter(t => t.status === 'missed');

    const stats = {
      pendingCount: pending.length,
      completedCount: completed.length,
      missedCount: missed.length,
      totalCount: tasks.length
    };

    const nudgeText = await gemini.generateNudge(tasks, stats, userKey);
    res.json({ success: true, nudge: nudgeText });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/tasks/briefing
 * @desc    Get Morning Briefing summary
 * @access  Private
 */
router.get('/briefing', protect, async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    
    // Fetch pending tasks
    const pendingTasks = await Task.find({ userId: req.user._id, status: 'pending' }).sort({ priorityScore: -1 });

    // Calculate completion rate yesterday
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0,0,0,0);

    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23,59,59,999);

    const yesterdayTasks = await Task.find({
      userId: req.user._id,
      $or: [
        { deadline: { $gte: startOfYesterday, $lte: endOfYesterday } },
        { completedAt: { $gte: startOfYesterday, $lte: endOfYesterday } }
      ]
    });

    let completionRate = 100; // default if no tasks yesterday
    if (yesterdayTasks.length > 0) {
      const completedYesterday = yesterdayTasks.filter(t => t.status === 'completed').length;
      completionRate = Math.round((completedYesterday / yesterdayTasks.length) * 100);
    }

    const briefingText = await gemini.generateMorningBriefing(pendingTasks, completionRate, userKey);
    res.json({ success: true, briefing: briefingText });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
