import React, { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden text-gray-100 font-sans">
          {/* Decorative background gradients */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

          <div className="w-full max-w-md bg-[#111827]/40 border border-gray-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/5">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Something went wrong</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                TASKping encountered a runtime issue. You can attempt to reload the application to restore your session.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-[#1f2937]/35 border border-gray-800 rounded-xl text-left overflow-hidden">
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Error Diagnostic</p>
                <code className="text-xs text-rose-400 break-words block max-h-32 overflow-y-auto font-mono leading-relaxed">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 animate-spin-slow" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
