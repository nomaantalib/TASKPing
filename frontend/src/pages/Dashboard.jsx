import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import SpeechInput from '../components/SpeechInput';
import TaskChart from '../components/TaskChart';
import NudgeBanner from '../components/NudgeBanner';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Briefcase,
  User,
  Heart,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  Calendar,
  X,
  ChevronRight,
  Flame,
  CheckSquare,
  Edit3
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search & RAG
  const [searchQuery, setSearchQuery] = useState('');
  
  // Morning Briefing
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Overdue Check & Reprioritized status banner
  const [showReprioritizeBanner, setShowReprioritizeBanner] = useState(false);
  const [reprioritizing, setReprioritizing] = useState(false);

  // NL Parser
  const [nlText, setNlText] = useState('');
  const [parsingNL, setParsingNL] = useState(false);

  // Task Form Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedEffort: 1,
    category: 'Work',
    isRecurring: false
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Editing state
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedEffort: 1,
    category: 'Work',
    isRecurring: false
  });

  // Load initial tasks
  const fetchTasks = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/tasks?q=${encodeURIComponent(query)}` : '/tasks';
      const res = await api.get(url);
      if (res.data.success) {
        setTasks(res.data.tasks);
        
        // Run overdue check if fetching initial list
        if (!query) {
          checkOverdueAndPrioritize(res.data.tasks);
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load morning briefing
  const fetchBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await api.get('/tasks/briefing');
      if (res.data.success) {
        setBriefing(res.data.briefing);
      }
    } catch (err) {
      console.error('Error fetching briefing:', err);
      setBriefing('Enjoy your day! Make sure to take breaks and log your completed tasks.');
    } finally {
      setBriefingLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchBriefing();
  }, []);

  // Check if any pending tasks are past their deadline
  const checkOverdueAndPrioritize = async (taskList) => {
    const now = new Date();
    const hasOverdue = taskList.some(
      (t) => t.status === 'pending' && new Date(t.deadline) < now
    );

    if (hasOverdue) {
      setReprioritizing(true);
      try {
        // Automatically call prioritize route
        const res = await api.post('/tasks/prioritize');
        if (res.data.success) {
          setTasks(res.data.tasks);
          setShowReprioritizeBanner(true);
          // Set a 3-second auto-close for the banner
          setTimeout(() => setShowReprioritizeBanner(false), 8000);
        }
      } catch (err) {
        console.error('Failed to auto-reprioritize:', err);
      } finally {
        setReprioritizing(false);
      }
    }
  };

  // Trigger manual prioritization
  const handleManualPrioritize = async () => {
    setReprioritizing(true);
    try {
      const res = await api.post('/tasks/prioritize');
      if (res.data.success) {
        setTasks(res.data.tasks);
        setShowReprioritizeBanner(true);
      }
    } catch (err) {
      console.error('Failed to prioritize tasks:', err);
    } finally {
      setReprioritizing(false);
    }
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data.success) {
        // Update local state
        setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
        fetchBriefing(); // reload completion rates
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data.success) {
        setTasks(prev => prev.filter(t => t._id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Handle Search Input (Vector RAG)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchTasks('');
  };

  // Start manual task editing
  const handleStartEdit = (task) => {
    setEditingTask(task);
    
    // Format deadline from database ISO format (YYYY-MM-DDTHH:mm:ss...) to datetime-local format (YYYY-MM-DDTHH:mm)
    let formattedDeadline = '';
    if (task.deadline) {
      const date = new Date(task.deadline);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setEditForm({
      title: task.title || '',
      description: task.description || '',
      deadline: formattedDeadline,
      estimatedEffort: task.estimatedEffort || 1,
      category: task.category || 'Work',
      isRecurring: task.isRecurring || false
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setFormSubmitting(true);
    try {
      const res = await api.put(`/tasks/${editingTask._id}`, editForm);
      if (res.data.success) {
        setTasks(prev => prev.map(t => t._id === editingTask._id ? res.data.task : t));
        setEditingTask(null);
      }
    } catch (err) {
      console.error('Error updating task:', err);
      const errMsg = err.response?.data?.message || 'Failed to update task.';
      alert(errMsg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Parse Natural Language Task / Command
  const handleNLSubmit = async (e) => {
    e.preventDefault();
    if (!nlText.trim()) return;

    setParsingNL(true);
    try {
      const res = await api.post('/tasks/nl-add', { text: nlText });
      if (res.data.success) {
        if (res.data.type === 'update') {
          // Perform UI replacement on update
          setTasks(prev => prev.map(t => t._id === res.data.task._id ? res.data.task : t));
          alert(res.data.message || 'Task updated successfully via AI!');
        } else {
          // Add newly created task
          setTasks(prev => [res.data.task, ...prev]);
        }
        setNlText('');
      }
    } catch (err) {
      console.error('Failed to parse NL input:', err);
      const errMsg = err.response?.data?.message || 'AI parsing failed. Please specify a due date and time, or enter the task manually.';
      alert(errMsg);
    } finally {
      setParsingNL(false);
    }
  };

  // Handle speech voice transcripts
  const handleVoiceTranscript = (text) => {
    setNlText(text);
  };

  // Manual Task Submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const res = await api.post('/tasks', taskForm);
      if (res.data.success) {
        setTasks(prev => [res.data.task, ...prev]);
        setIsModalOpen(false);
        setTaskForm({
          title: '',
          description: '',
          deadline: '',
          estimatedEffort: 1,
          category: 'Work',
          isRecurring: false
        });
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'work': return <Briefcase className="w-4 h-4 text-blue-400" />;
      case 'personal': return <User className="w-4 h-4 text-purple-400" />;
      case 'health': return <Heart className="w-4 h-4 text-emerald-400" />;
      case 'finance': return <DollarSign className="w-4 h-4 text-amber-400" />;
      default: return <CheckSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Category classes
  const getCategoryBadge = (category) => {
    switch (category?.toLowerCase()) {
      case 'work': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'personal': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'health': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'finance': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Auto-Reprioritize Banner */}
      {showReprioritizeBanner && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex justify-between items-center gap-4 text-amber-400 text-sm shadow-lg backdrop-blur-md animate-bounce">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div>
              <strong className="font-bold">AI Reprioritization Active:</strong>
              <span className="ml-1">Overdue tasks detected. We have automatically re-calculated task priority scores.</span>
            </div>
          </div>
          <button 
            onClick={() => setShowReprioritizeBanner(false)}
            className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Dashboard</h2>
          <p className="text-sm text-gray-400">Welcome, {user?.name}. Here is your AI productivity cockpit.</p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="relative w-64">
            <input
              type="text"
              placeholder="Semantic RAG Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b]/40 border border-gray-800 focus:border-indigo-500 rounded-xl pl-10 pr-8 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-500"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            {searchQuery && (
              <button 
                type="button" 
                onClick={handleClearSearch}
                className="absolute right-3 top-3 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <button
            onClick={handleManualPrioritize}
            disabled={reprioritizing}
            className="p-2.5 bg-gray-850 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 rounded-xl border border-gray-800 transition-colors cursor-pointer"
            title="Force AI Prioritization"
          >
            <RotateCcw className={`w-4 h-4 ${reprioritizing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* RAG Search Banner Info */}
      {searchQuery && (
        <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-400">
          <span>Semantic search results showing top 5 tasks matching: "<strong>{searchQuery}</strong>"</span>
          <button onClick={handleClearSearch} className="font-semibold underline">Show All Tasks</button>
        </div>
      )}

      {/* Grid: Morning Briefing & Nudges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Morning Briefing card */}
        <div className="lg:col-span-2 bg-[#111827]/30 border border-gray-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Morning Briefing</h3>
            </div>
            {briefingLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-4 bg-gray-850 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-850 rounded w-5/6 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed font-medium">
                {briefing || "Fetching today's brief summary..."}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800/40 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Peak window: <strong className="text-gray-300 capitalize">{user?.energyWindow || 'morning'} focus</strong></span>
          </div>
        </div>

        {/* Live Nudge Buddy */}
        <NudgeBanner tasks={tasks} />
      </div>

      {/* Natural Language parser Input */}
      <form onSubmit={handleNLSubmit} className="bg-[#111827]/20 border border-gray-850 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Type a task: 'Submit report tomorrow at 2pm category Work effort 2h' or click Mic to speak..."
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            disabled={parsingNL}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-550 pr-4"
          />
        </div>
        <div className="flex gap-2 justify-end items-center flex-shrink-0">
          <SpeechInput onTranscript={handleVoiceTranscript} disabled={parsingNL} />
          
          <button
            type="submit"
            disabled={parsingNL || !nlText.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            {parsingNL ? 'Parsing...' : 'AI Parse'}
          </button>
        </div>
      </form>

      {/* Main Grid: Tasks List & Priority Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111827]/30 border border-gray-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                Active Tasks
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-850 text-gray-400 border border-gray-800">
                {tasks.filter(t => t.status === 'pending').length} pending
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center items-center">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-20 text-center text-gray-500 text-sm">
                No tasks found. Create a new task manually or parse with AI above.
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  return (
                    <div 
                      key={task._id} 
                      className={`p-4 rounded-xl border transition-all duration-200 flex items-start gap-3.5 group ${
                        isCompleted 
                          ? 'bg-emerald-950/5 border-emerald-950/30 opacity-60' 
                          : 'bg-[#1e293b]/20 border-gray-850 hover:border-gray-800'
                      }`}
                    >
                      {/* Completion check */}
                      <button
                        onClick={() => handleToggleComplete(task._id, task.status)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-gray-700 hover:border-indigo-400 text-transparent'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Info */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                            {task.title}
                          </h4>
                          
                          {/* Streak Counter for recurring */}
                          {task.isRecurring && (
                            <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded-md border border-amber-500/10">
                              <Flame className="w-3 h-3 fill-amber-500" />
                              {task.streakCount} streak
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Badges / Meta */}
                        <div className="flex gap-4 items-center flex-wrap pt-2 text-[10px] text-gray-500">
                          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] uppercase font-bold tracking-wider ${getCategoryBadge(task.category)}`}>
                            {getCategoryIcon(task.category)}
                            {task.category}
                          </span>
                          
                          <span className="flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {task.estimatedEffort}h effort
                          </span>

                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            Due {new Date(task.deadline).toLocaleDateString()} at {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {task.priorityScore > 0 && !isCompleted && (
                            <span className="flex items-center gap-1 font-semibold">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              Priority {task.priorityScore}/10
                            </span>
                          )}
                        </div>

                        {/* AI reasoning tag */}
                        {task.aiReasoning && !isCompleted && (
                          <p className="text-[10px] italic text-indigo-400 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10 mt-2">
                            <strong>AI reasoning:</strong> {task.aiReasoning}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-1.5 text-gray-650 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                          title="Edit Task"
                          aria-label="Edit Task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1.5 text-gray-650 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                          title="Delete Task"
                          aria-label="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Priority Charts */}
        <div className="space-y-6">
          <TaskChart tasks={tasks} />
        </div>

      </div>

      {/* Manual Task Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Add New Task</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  placeholder="Review quarter metrics"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Enter context details..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Deadline</label>
                  <input
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Estimated Effort (hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={taskForm.estimatedEffort}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, estimatedEffort: parseFloat(e.target.value) || 1 }))}
                    className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#1e293b] border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    {['Work', 'Personal', 'Health', 'Finance', 'Lifestyle', 'Study', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={taskForm.isRecurring}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="w-4.5 h-4.5 bg-slate-900 border-gray-850 rounded text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <label htmlFor="isRecurring" className="text-xs font-semibold text-gray-300 cursor-pointer">Recurring Task / Habit</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-850 hover:bg-gray-800 text-gray-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
                >
                  {formSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTask(null)} />
          
          <div className="bg-[#111827]/90 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative z-10 space-y-4 backdrop-blur-md">
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Edit Task</h3>
              <button 
                onClick={() => setEditingTask(null)} 
                className="text-gray-400 hover:text-white"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  placeholder="Review quarter metrics"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Enter context details..."
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Deadline</label>
                  <input
                    type="datetime-local"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Estimated Effort (hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={editForm.estimatedEffort}
                    onChange={(e) => setEditForm(prev => ({ ...prev, estimatedEffort: parseFloat(e.target.value) || 1 }))}
                    className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#1e293b] border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    {['Work', 'Personal', 'Health', 'Finance', 'Lifestyle', 'Study', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="editIsRecurring"
                    checked={editForm.isRecurring}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="w-4.5 h-4.5 bg-slate-900 border-gray-850 rounded text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <label htmlFor="editIsRecurring" className="text-xs font-semibold text-gray-300 cursor-pointer">Recurring Task / Habit</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-5 py-2.5 bg-gray-850 hover:bg-gray-800 text-gray-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
