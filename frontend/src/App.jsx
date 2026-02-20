import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import DashboardOverview from './pages/DashboardOverview';
import DLQMessagesPage from './pages/DLQMessagesPage';
import RetryLogs from './pages/RetryLogs';
import CircuitBreakerStatus from './pages/CircuitBreakerStatus';
import ReplayManager from './pages/ReplayManager';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/overview" element={<DashboardOverview />} />
          <Route path="/dlq-messages" element={<DLQMessagesPage />} />
          <Route path="/retry-logs" element={<RetryLogs />} />
          <Route path="/circuit-breaker" element={<CircuitBreakerStatus />} />
          <Route path="/replay-manager" element={<ReplayManager />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
