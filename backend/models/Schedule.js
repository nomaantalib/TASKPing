const mongoose = require('mongoose');

const ScheduleBlockSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  startTime: {
    type: String, // format HH:MM
    required: true
  },
  endTime: {
    type: String, // format HH:MM
    required: true
  }
});

const ScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  blocks: {
    type: [ScheduleBlockSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only have one schedule per day
ScheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
