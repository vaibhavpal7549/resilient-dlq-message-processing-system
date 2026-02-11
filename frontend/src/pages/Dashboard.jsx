import React, { useState, useEffect } from 'react';
import { systemAPI, dlqAPI } from '../services/api';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Database,
  Zap,
  AlertTriangle,
  BarChart3,
  Play,
  Eye
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [healthRes, statsRes, messagesRes] = await Promise.all([
        systemAPI.getHealth(),
        dlqAPI.getStats(),
        dlqAPI.list({ limit: 5, page: 1 })
      ]);
      setHealth(healthRes.data);
      setStats(statsRes.data.stats);
      setRecentMessages(messagesRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const circuitState = health?.components?.circuitBreaker?.state || 'UNKNOWN';
  const queueMetrics = health?.components?.queue?.metrics || {};
  const dlqByStatus = stats?.byStatus || {};

  // Prepare chart data
  const queueChartData = [
    { name: 'Waiting', value: queueMetrics.waiting || 0, color: '#3b82f6' },
    { name: 'Active', value: queueMetrics.active || 0, color: '#10b981' },
    { name: 'Completed', value: queueMetrics.completed || 0, color: '#14b8a6' },
    { name: 'Failed', value: queueMetrics.failed || 0, color: '#ef4444' },
    { name: 'Delayed', value: queueMetrics.delayed || 0, color: '#f59e0b' }
  ];

  const dlqChartData = [
    { name: 'Pending', value: dlqByStatus.dlq_pending || 0 },
    { name: 'Resolved', value: dlqByStatus.dlq_resolved || 0 },
    { name: 'Failed', value: dlqByStatus.dlq_failed || 0 },
    { name: 'Processing', value: dlqByStatus.dlq_processing || 0 }
  ];

  const COLORS = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            DLQ Management Dashboard
          </h1>
          <p className="text-slate-400">
            Real-time monitoring and management of Dead Letter Queue system
          </p>
        </div>

        {/* Circuit Breaker Status - Most Prominent */}
        <CircuitBreakerBanner circuitState={circuitState} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Queue Depth"
            value={queueMetrics.total || 0}
            icon={<Database className="w-5 h-5" />}
            status="info"
            subtitle={`${queueMetrics.active || 0} active messages`}
            trend="+12%"
          />
          <KPICard
            title="DLQ Pending"
            value={dlqByStatus.dlq_pending || 0}
            icon={<AlertCircle className="w-5 h-5" />}
            status={dlqByStatus.dlq_pending > 0 ? 'warning' : 'success'}
            subtitle="Awaiting retry"
            trend={dlqByStatus.dlq_pending > 0 ? '+5%' : '0%'}
          />
          <KPICard
            title="DLQ Resolved"
            value={dlqByStatus.dlq_resolved || 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            status="success"
            subtitle="Successfully processed"
            trend="+8%"
          />
          <KPICard
            title="Failed Messages"
            value={dlqByStatus.dlq_failed || 0}
            icon={<AlertTriangle className="w-5 h-5" />}
            status={dlqByStatus.dlq_failed > 0 ? 'error' : 'success'}
            subtitle="Permanent failures"
            trend={dlqByStatus.dlq_failed > 0 ? '+3%' : '0%'}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Queue Metrics Chart */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Queue Metrics</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={queueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {queueChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* DLQ Status Distribution */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">DLQ Status Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dlqChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dlqChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent DLQ Activity */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Recent DLQ Activity</h2>
            </div>
          </div>
          {recentMessages.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No DLQ messages</p>
              <p className="text-slate-500 text-sm mt-1">All messages are processing successfully</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Message ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Failure Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Retry Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {recentMessages.map((msg) => (
                    <tr key={msg._id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-blue-400 bg-slate-900 px-2 py-1 rounded">
                          {msg.messageId?.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-red-400">{msg.errorType || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-300 font-medium">{msg.retryCount || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                            <Play className="w-3 h-3" />
                            Replay
                          </button>
                          <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                            <Eye className="w-3 h-3" />
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Errors */}
        {stats?.topErrors && stats.topErrors.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Top Error Types</h2>
            </div>
            <div className="space-y-3">
              {stats.topErrors.map((error, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <code className="text-sm font-mono text-slate-300">{error._id}</code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">{error.count} occurrences</span>
                    <div className="w-32 bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min((error.count / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CircuitBreakerBanner({ circuitState }) {
  const statusConfig = {
    CLOSED: {
      bg: 'bg-gradient-to-r from-green-900/40 to-emerald-900/40',
      border: 'border-green-700',
      text: 'text-green-400',
      icon: <CheckCircle2 className="w-6 h-6 text-green-400" />,
      message: 'System Healthy',
      subtitle: 'All systems operational - Circuit breaker is CLOSED',
      indicator: 'bg-green-500'
    },
    OPEN: {
      bg: 'bg-gradient-to-r from-red-900/40 to-rose-900/40',
      border: 'border-red-700',
      text: 'text-red-400',
      icon: <AlertCircle className="w-6 h-6 text-red-400" />,
      message: 'Circuit Open',
      subtitle: 'System protection activated - High failure rate detected',
      indicator: 'bg-red-500 animate-pulse'
    },
    HALF_OPEN: {
      bg: 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40',
      border: 'border-yellow-700',
      text: 'text-yellow-400',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />,
      message: 'Circuit Half-Open',
      subtitle: 'Testing system recovery - Limited traffic allowed',
      indicator: 'bg-yellow-500 animate-pulse'
    },
    UNKNOWN: {
      bg: 'bg-gradient-to-r from-slate-800/40 to-slate-700/40',
      border: 'border-slate-600',
      text: 'text-slate-400',
      icon: <Clock className="w-6 h-6 text-slate-400" />,
      message: 'Status Unknown',
      subtitle: 'Connecting to backend services...',
      indicator: 'bg-slate-500'
    }
  };

  const config = statusConfig[circuitState] || statusConfig.UNKNOWN;

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-lg p-6 mb-6 shadow-xl`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {config.icon}
          <div>
            <h3 className={`text-xl font-bold ${config.text} mb-1`}>{config.message}</h3>
            <p className="text-slate-400 text-sm">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Circuit State</span>
            <span className={`text-lg font-bold ${config.text}`}>{circuitState}</span>
          </div>
          <div className={`w-4 h-4 rounded-full ${config.indicator} shadow-lg`}></div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, status, subtitle, trend }) {
  const statusColors = {
    success: 'border-green-700 bg-green-900/20',
    error: 'border-red-700 bg-red-900/20',
    warning: 'border-yellow-700 bg-yellow-900/20',
    info: 'border-blue-700 bg-blue-900/20'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  const valueColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className={`bg-slate-800 rounded-lg border-2 ${statusColors[status]} p-5 hover:shadow-lg hover:scale-105 transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${statusColors[status]}`}>
          <div className={iconColors[status]}>{icon}</div>
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${valueColors[status]} mb-1`}>{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    dlq_pending: {
      bg: 'bg-yellow-900/30',
      text: 'text-yellow-400',
      border: 'border-yellow-700',
      label: 'Pending'
    },
    dlq_processing: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-400',
      border: 'border-blue-700',
      label: 'Processing'
    },
    dlq_resolved: {
      bg: 'bg-green-900/30',
      text: 'text-green-400',
      border: 'border-green-700',
      label: 'Resolved'
    },
    dlq_failed: {
      bg: 'bg-red-900/30',
      text: 'text-red-400',
      border: 'border-red-700',
      label: 'Failed'
    },
    dlq_manual: {
      bg: 'bg-purple-900/30',
      text: 'text-purple-400',
      border: 'border-purple-700',
      label: 'Manual'
    }
  };

  const config = statusConfig[status] || statusConfig.dlq_pending;

  return (
    <span className={`inline-flex items-center ${config.bg} ${config.text} border ${config.border} px-2.5 py-1 rounded-md text-xs font-semibold`}>
      {config.label}
    </span>
  );
}
