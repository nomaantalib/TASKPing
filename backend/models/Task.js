const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  estimatedEffort: {
    type: Number,
    required: true, // in hours
    default: 1
  },
  category: {
    type: String,
    required: true,
    default: 'Work'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending'
  },
  priorityScore: {
    type: Number,
    default: 0
  },
  aiReasoning: {
    type: String,
    default: ''
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  streakCount: {
    type: Number,
    default: 0
  },
  embedding: {
    type: [Number],
    default: []
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', TaskSchema);
