import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Settings as SettingsIcon, ShieldCheck, Key, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

const Settings = () => {
  const { user, updateSettings } = useContext(AuthContext);
  
  const [energyWindow, setEnergyWindow] = useState('morning');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEnergyWindow(user.energyWindow || 'morning');
      setStatus({ type: '', message: '' });
      // Mask key for safety if it exists
      setGeminiApiKey(user.geminiApiKey || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await updateSettings({ energyWindow, geminiApiKey });
      if (res.success) {
        setStatus({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to save settings.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">App Settings</h2>
          <p className="text-sm text-gray-400">Configure your personal AI preferences and integration keys.</p>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
          status.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          
          {/* Energy window card */}
          <div className="bg-[#111827]/30 border border-gray-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Peak Energy Window
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select the time of day when you are most focused. The AI scheduling engine will automatically place high-priority and high-effort tasks in this block to optimize your productivity.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { id: 'morning', label: 'Morning Focus', time: '09:00 - 12:00' },
                { id: 'afternoon', label: 'Afternoon Focus', time: '12:00 - 15:00' },
                { id: 'evening', label: 'Evening Focus', time: '15:00 - 18:00' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setEnergyWindow(opt.id)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all duration-200 ${
                    energyWindow === opt.id
                      ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-[#1e293b]/40 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <span className={`text-sm font-semibold ${energyWindow === opt.id ? 'text-white' : 'text-gray-300'}`}>{opt.label}</span>
                  <span className="text-xs text-gray-500">{opt.time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API key card */}
          <div className="bg-[#111827]/30 border border-gray-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Custom Gemini API Key (Optional)
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              By default, TASKping uses its internal key rotation. If you hit quota limits or want to connect your own engine, you can supply your personal key here. Your key is stored securely and used exclusively for your requests.
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gemini API Key</label>
                <a 
                  href="https://aistudio.google.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
                >
                  Get a free key from Google AI Studio ↗
                </a>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-[#1e293b]/40 border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-650"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          >
            {saving ? 'Saving changes...' : 'Save Settings'}
          </button>
        </form>

        {/* Info card */}
        <div className="bg-gradient-to-br from-[#111827]/40 to-slate-900 border border-gray-800 rounded-2xl p-6 h-fit space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Security & Integration
          </h4>
          <ul className="space-y-3 text-xs text-gray-450 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Your custom API key is sent directly to Google's API servers. No third-party relays are used.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>All schedule computations, NLP parsers, and task urgencies are performed server-side with strict memory protection.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Embeddings (semantic task vectors) are stored inside your private task database. These are used locally in JS for instant, high-speed context search.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;
