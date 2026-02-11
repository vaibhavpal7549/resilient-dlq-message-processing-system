import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DLQMessages from './pages/DLQMessages';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        {/* Navigation */}
        <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">DLQ System</h1>
              <div className="flex gap-6">
                <Link
                  to="/"
                  className="text-white/80 hover:text-white transition font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dlq"
                  className="text-white/80 hover:text-white transition font-medium"
                >
                  DLQ Messages
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dlq" element={<DLQMessages />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
