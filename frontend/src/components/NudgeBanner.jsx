import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Sparkles, RefreshCw } from 'lucide-react';

const NudgeBanner = ({ tasks }) => {
  const [nudge, setNudge] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNudge = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/nudge');
      if (res.data.success) {
        setNudge(res.data.nudge);
      }
    } catch (err) {
      console.error('Failed to fetch nudge:', err);
      setNudge('Keep going! Small steps lead to big accomplishments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      fetchNudge();
    } else {
      setNudge('Welcome! Add some tasks above, and I will start giving you intelligent focus advice.');
    }
  }, [tasks.length]); // Refetch when task count changes

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-xl flex gap-4 items-start backdrop-blur-md">
      {/* Decorative Glow */}
      <div className="absolute -left-12 -top-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

      {/* Avatar Icon */}
      <div className="flex-shrink-0 p-3 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      {/* Nudge Content */}
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">TASKping AI Buddy</h4>
        {loading ? (
          <div className="h-5 flex items-center">
            <span className="text-xs text-gray-400 italic">Analyzing task progress and preparing advice...</span>
          </div>
        ) : (
          <p className="text-sm text-gray-200 leading-relaxed font-medium">"{nudge}"</p>
        )}
      </div>

      {/* Refresh Trigger */}
      <button
        onClick={fetchNudge}
        disabled={loading}
        title="Refresh Advice"
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors self-center flex-shrink-0"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default NudgeBanner;
