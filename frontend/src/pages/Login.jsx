import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const { login, register, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email || !password || (isRegister && !name)) {
      setErrorMsg('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isRegister) {
        result = await register(name, email, password);
      } else {
        result = await login(email, password);
      }

      if (result.success) {
        navigate('/');
      } else {
        setErrorMsg(result.message || 'An error occurred.');
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blurred circles for visual aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-[#111827]/40 border border-gray-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        
        {/* App Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 mb-3.5">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">TASKping</h2>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">
            {isRegister ? 'Create an account to start planning' : 'Welcome back! Log in to your planner'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full bg-[#1f2937]/40 border border-gray-850 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-600"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-[#1f2937]/40 border border-gray-850 hover:border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="w-full bg-[#1f2937]/40 border border-gray-850 hover:border-gray-700 focus:border-indigo-500 rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-450 hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              isRegister ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 text-center border-t border-gray-800/60 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
