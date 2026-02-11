import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DLQMessages from './pages/DLQMessages';
import { LayoutDashboard, MessageSquare, Settings } from 'lucide-react';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dlq" element={<DLQMessages />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Navigation() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DLQ System</h1>
              <p className="text-xs text-slate-400">Dead Letter Queue Management</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
              active={isActive('/')}
            />
            <NavLink
              to="/dlq"
              icon={<MessageSquare className="w-4 h-4" />}
              label="DLQ Messages"
              active={isActive('/dlq')}
            />
            <button className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white font-semibold shadow-lg'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export default App;
