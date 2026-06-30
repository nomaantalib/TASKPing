import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  User
} from 'lucide-react';
import ReminderManager from './ReminderManager';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSchedule, setRightSchedule] = useState([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0 });

  // Swipe / Touch gestures state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Do not intercept swiping if user is typing on an input or textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    if (isLeftSwipe) {
      setRightSidebarOpen(true);
    }
    if (isRightSwipe) {
      setRightSidebarOpen(false);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const fetchRightSidebarData = async () => {
    try {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${date}`;
      
      const res = await api.get(`/schedule?date=${todayStr}`);
      if (res.data.success && res.data.schedule) {
        setRightSchedule(res.data.schedule.blocks || []);
      }

      const taskRes = await api.get('/tasks');
      if (taskRes.data.success) {
        const pending = taskRes.data.tasks.filter(t => t.status === 'pending').length;
        const completed = taskRes.data.tasks.filter(t => t.status === 'completed').length;
        setStats({ pending, completed });
      }
    } catch (err) {
      console.error('Failed to load right sidebar data:', err);
    }
  };

  useEffect(() => {
    if (rightSidebarOpen) {
      fetchRightSidebarData();
    }
  }, [rightSidebarOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Daily Planner', href: '/planner', icon: Calendar },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col md:flex-row"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center bg-[#111827]/80 backdrop-blur-md px-4 py-3 border-b border-gray-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TASKping Logo" className="w-8 h-8 object-cover shadow-md shadow-indigo-600/20" style={{ borderRadius: '20%' }} />
          <span className="text-xl font-bold tracking-tight text-white">TASKping</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title="AI Insights Panel"
            aria-label="AI Insights Panel"
            className="p-1.5 text-indigo-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </button>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Menu"
            aria-label="Toggle Menu"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111827]/90 md:bg-[#111827]/50 backdrop-blur-lg border-r border-gray-800/80 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out overflow-y-auto
        md:translate-x-0 md:static md:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 px-2">
            <img src="/logo.png" alt="TASKping Logo" className="w-10 h-10 object-cover shadow-lg shadow-indigo-600/20" style={{ borderRadius: '20%' }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">TASKping</h1>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">TaskPilot AI</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-gray-800/60 pt-4 flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-indigo-400 font-bold uppercase shadow-inner">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user.energyWindow} focus</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-200 font-medium"
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-rose-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Right Sidebar Overlay */}
      {rightSidebarOpen && (
        <div 
          onClick={() => setRightSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Desktop Floating Right Sidebar Toggle */}
      <button
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        title="AI Insights Panel"
        aria-label="AI Insights Panel"
        className="hidden md:flex fixed right-6 top-6 z-40 p-3 bg-[#111827]/80 hover:bg-[#1e293b] border border-gray-800 text-indigo-400 hover:text-white rounded-xl shadow-lg transition-all cursor-pointer items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Right Sidebar (AI Insights Panel) */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-[#111827]/95 border-l border-gray-800/80 p-5 flex flex-col transform transition-transform duration-300 ease-in-out backdrop-blur-lg shadow-2xl overflow-y-auto
        ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex justify-between items-center pb-4 border-b border-gray-800/60 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Copilot Panel</h2>
          </div>
          <button 
            onClick={() => setRightSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Close Panel"
            aria-label="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable insights */}
        <div className="flex-1 space-y-6 pr-1">
          {/* Quick Stats */}
          <div className="p-4 bg-[#1e293b]/30 border border-gray-850 rounded-2xl space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left">Workspace Health</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <span className="block text-lg font-black text-indigo-400">{stats.pending}</span>
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Pending</span>
              </div>
              <div className="p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <span className="block text-lg font-black text-emerald-400">{stats.completed}</span>
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Completed</span>
              </div>
            </div>
          </div>

          {/* Schedule blocks overview */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 text-left">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Today's Schedule
            </h3>
            
            {rightSchedule.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-4 text-center">No schedule blocks generated yet.</p>
            ) : (
              <div className="relative border-l border-indigo-500/20 ml-2 pl-4 py-1 space-y-4">
                {rightSchedule.map((block) => {
                  const t = block.taskId;
                  if (!t || typeof t !== 'object') return null;
                  return (
                    <div key={block._id} className="relative group text-left">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-900 shadow-sm" />
                      
                      <div className="text-xs">
                        <span className="text-[10px] font-bold text-indigo-400 block mb-0.5">{block.startTime} - {block.endTime}</span>
                        <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{t.title}</h4>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-550">{t.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Background Proactive Reminders Daemon */}
      <ReminderManager />
    </div>
  );
};

export default Layout;
