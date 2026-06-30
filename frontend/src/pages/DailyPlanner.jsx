import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Info
} from 'lucide-react';

const DailyPlanner = () => {
  const [schedule, setSchedule] = useState({ blocks: [], date: '' });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSchedule = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/schedule');
      if (res.data.success) {
        setSchedule(res.data.schedule || { blocks: [], date: '' });
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setErrorMsg('Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/schedule/generate');
      if (res.data.success) {
        setSchedule(res.data.schedule);
        setSuccessMsg('AI Schedule generated successfully!');
      }
    } catch (err) {
      console.error('Error generating schedule:', err);
      setErrorMsg(err.response?.data?.message || 'Could not generate schedule. Do you have pending tasks?');
    } finally {
      setGenerating(false);
    }
  };

  // Convert "HH:MM" string to minutes for sorting/timeline comparison
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Sort blocks chronologically
  const sortedBlocks = [...(schedule.blocks || [])].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'work': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'personal': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'health': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'finance': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'study': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Daily Planner</h2>
            <p className="text-sm text-gray-400">Manage and execute your structured day block by block.</p>
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate AI Schedule
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main planner grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827]/30 border border-gray-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Today's Timeline
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 border border-gray-700">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center items-center">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : sortedBlocks.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <HelpCircle className="w-12 h-12 text-gray-650 mx-auto" />
                <div className="space-y-1">
                  <p className="text-white font-bold">No schedule generated yet</p>
                  <p className="text-gray-500 text-xs max-w-xs mx-auto">
                    Click "Generate AI Schedule" to turn your prioritized tasks into structured daily time blocks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-500/20 ml-3 pl-8 py-2 space-y-6">
                {sortedBlocks.map((block, idx) => {
                  const task = block.taskId;
                  if (!task || typeof task !== 'object') return null;

                  return (
                    <div key={block._id} className="relative group">
                      
                      {/* Timeline dot */}
                      <span className="absolute -left-[41px] top-4 w-6 h-6 rounded-full bg-[#0b0f19] border-2 border-indigo-500 flex items-center justify-center text-indigo-400 font-bold text-[9px] shadow-lg">
                        {idx + 1}
                      </span>

                      {/* Timeline card */}
                      <div className="p-4 bg-[#1e293b]/30 hover:bg-[#1e293b]/60 border border-gray-800 hover:border-indigo-500/30 rounded-xl transition-all duration-200 shadow-md">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10">
                            <Clock className="w-3.5 h-3.5" />
                            {block.startTime} - {block.endTime}
                          </span>
                          
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getCategoryColor(task.category)}`}>
                            {task.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center mt-3 pt-3 border-t border-gray-800/40 text-[11px] text-gray-500">
                          <span>Effort: <strong className="text-gray-300">{task.estimatedEffort}h</strong></span>
                          <span>Priority Score: <strong className="text-gray-300">{task.priorityScore || 'N/A'}/10</strong></span>
                          <span>Due: <strong className="text-gray-300">{new Date(task.deadline).toLocaleDateString()} at {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Insights */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#111827]/40 to-slate-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              AI Scheduling Policy
            </h4>
            <div className="space-y-4 text-xs text-gray-400 leading-relaxed">
              <p>
                The schedule is dynamically generated between **09:00** and **18:00** based on two main criteria:
              </p>
              
              <div className="space-y-2 border-l border-indigo-500/30 pl-3">
                <p>
                  <strong className="text-white">1. Urgency / Priority Ranking:</strong> High priority scores are scheduled first to ensure you tackle vital items.
                </p>
                <p>
                  <strong className="text-white">2. Peak Energy Match:</strong> The system reads your Settings page energy window and slots your heaviest task loads during your peak focus hours.
                </p>
              </div>

              <p>
                Buffer spaces of **10-15 minutes** are inserted between blocks to reduce mental exhaustion.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DailyPlanner;
