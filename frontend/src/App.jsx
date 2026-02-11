import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DLQMessages from './pages/DLQMessages';
import { LayoutDashboard, MessageSquare, Settings } from 'lucide-react';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-bold">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DLQ System</h1>
              <p className="text-xs text-gray-500">Dead Letter Queue Management</p>
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
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export default App;
