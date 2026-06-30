const Task = require('../models/Task');
const gemini = require('../services/gemini');

/**
 * Get all tasks
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = { userId: req.user._id };

    if (q && q.trim() !== '') {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query).sort({ deadline: 1 });
    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * Create manual task
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, deadline, estimatedEffort, category, isRecurring } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Please provide a title and deadline' });
    }

    const userKey = req.user.geminiApiKey;
    const embedding = await gemini.getEmbedding(`${title} ${description || ''}`, userKey);

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
};

/**
 * Create task via NLP
 */
exports.createTaskNL = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'No input text provided' });
    }

    const userKey = req.user.geminiApiKey;
    const pendingTasks = await Task.find({ userId: req.user._id, status: 'pending' });
    
    // Efficiently use embeddings: retrieve ONLY top 5 relevant tasks to minimize API tokens
    const relevantTasks = await gemini.getRelevantTasks(text, pendingTasks, userKey, 5);
    const command = await gemini.parseNLCommand(text, relevantTasks, userKey);

    if (!command || typeof command !== 'object') {
      return res.status(400).json({ success: false, message: 'AI failed to process the command. Please specify a due date and time.' });
    }

    if (command.type === 'error') {
      return res.status(400).json({ success: false, message: command.message || 'An error occurred parsing the command.' });
    }

    if (command.type === 'update') {
      const task = await Task.findOne({ _id: command.taskId, userId: req.user._id });
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task to update not found' });
      }

      const fields = command.data;
      if (fields.title !== undefined) task.title = fields.title;
      if (fields.description !== undefined) task.description = fields.description;
      if (fields.deadline !== undefined) task.deadline = new Date(fields.deadline);
      if (fields.estimatedEffort !== undefined) task.estimatedEffort = fields.estimatedEffort;
      if (fields.category !== undefined) task.category = fields.category;

      if (fields.title !== undefined || fields.description !== undefined) {
        task.embedding = await gemini.getEmbedding(`${task.title} ${task.description || ''}`, userKey);
      }

      const updatedTask = await task.save();
      return res.json({ 
        success: true, 
        type: 'update', 
        message: `Task "${updatedTask.title}" updated successfully via AI.`, 
        task: updatedTask 
      });
    }

    // CREATE command
    const fields = command.data;
    const embedding = await gemini.getEmbedding(`${fields.title} ${fields.description || ''}`, userKey);

    const task = await Task.create({
      userId: req.user._id,
      title: fields.title,
      description: fields.description,
      deadline: new Date(fields.deadline),
      estimatedEffort: fields.estimatedEffort || 1,
      category: fields.category || 'Work',
      embedding
    });

    res.status(201).json({ 
      success: true, 
      type: 'create', 
      message: `Task "${task.title}" created successfully.`, 
      task 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task
 */
exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, deadline, estimatedEffort, category, status, isRecurring } = req.body;

    let task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

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

    let embeddingChanged = false;
    if (title !== undefined && title !== task.title) {
      task.title = title;
      embeddingChanged = true;
    }
    if (description !== undefined && description !== task.description) {
      task.description = description;
      embeddingChanged = true;
    }
    if (deadline !== undefined) task.deadline = deadline;
    if (estimatedEffort !== undefined) task.estimatedEffort = estimatedEffort;
    if (category !== undefined) task.category = category;
    if (isRecurring !== undefined) task.isRecurring = isRecurring;

    if (embeddingChanged) {
      const userKey = req.user.geminiApiKey;
      task.embedding = await gemini.getEmbedding(`${task.title} ${task.description || ''}`, userKey);
    }

    const updatedTask = await task.save();
    res.json({ success: true, task: updatedTask });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete task
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const result = await Task.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Prioritize tasks
 */
exports.prioritize = async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    const pendingTasks = await Task.find({ userId: req.user._id, status: 'pending' });

    if (pendingTasks.length === 0) {
      return res.json({ success: true, message: 'No pending tasks to prioritize', tasks: [] });
    }

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

    const updatedTasks = await Task.find({ userId: req.user._id });
    res.json({ success: true, tasks: updatedTasks });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress nudge
 */
exports.getNudge = async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    const tasks = await Task.find({ userId: req.user._id });

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
};

/**
 * Get morning briefing
 */
exports.getBriefing = async (req, res, next) => {
  try {
    const userKey = req.user.geminiApiKey;
    const pendingTasks = await Task.find({ userId: req.user._id, status: 'pending' }).sort({ priorityScore: -1 });

    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);

    const yesterdayTasks = await Task.find({
      userId: req.user._id,
      $or: [
        { deadline: { $gte: startOfYesterday, $lte: endOfYesterday } },
        { completedAt: { $gte: startOfYesterday, $lte: endOfYesterday } }
      ]
    });

    let completionRate = 100;
    if (yesterdayTasks.length > 0) {
      const completedYesterday = yesterdayTasks.filter(t => t.status === 'completed').length;
      completionRate = Math.round((completedYesterday / yesterdayTasks.length) * 100);
    }

    const briefingText = await gemini.generateMorningBriefing(pendingTasks, completionRate, userKey);
    res.json({ success: true, briefing: briefingText });
  } catch (error) {
    next(error);
  }
};
