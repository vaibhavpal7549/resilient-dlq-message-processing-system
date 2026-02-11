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
  AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [healthRes, statsRes] = await Promise.all([
        systemAPI.getHealth(),
        dlqAPI.getStats()
      ]);
      setHealth(healthRes.data);
      setStats(statsRes.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const circuitState = health?.components?.circuitBreaker?.state || 'UNKNOWN';
  const queueMetrics = health?.components?.queue?.metrics || {};
  const dlqByStatus = stats?.byStatus || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DLQ Management Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and manage your Dead Letter Queue system in real-time
          </p>
        </div>

        {/* System Status Banner */}
        <SystemStatusBanner circuitState={circuitState} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Circuit Breaker"
            value={circuitState}
            icon={<Zap className="w-6 h-6" />}
            status={circuitState === 'CLOSED' ? 'success' : circuitState === 'OPEN' ? 'error' : 'warning'}
            subtitle={circuitState === 'CLOSED' ? 'System operational' : 'Check system health'}
          />
          <KPICard
            title="Queue Depth"
            value={queueMetrics.total || 0}
            icon={<Database className="w-6 h-6" />}
            status="info"
            subtitle={`${queueMetrics.active || 0} active`}
          />
          <KPICard
            title="DLQ Pending"
            value={dlqByStatus.dlq_pending || 0}
            icon={<AlertCircle className="w-6 h-6" />}
            status={dlqByStatus.dlq_pending > 0 ? 'warning' : 'success'}
            subtitle="Awaiting retry"
          />
          <KPICard
            title="DLQ Resolved"
            value={dlqByStatus.dlq_resolved || 0}
            icon={<CheckCircle2 className="w-6 h-6" />}
            status="success"
            subtitle="Successfully processed"
          />
        </div>

        {/* Queue Metrics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MetricsPanel
            title="Queue Metrics"
            icon={<Activity className="w-5 h-5" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <MetricItem label="Waiting" value={queueMetrics.waiting || 0} color="blue" />
              <MetricItem label="Active" value={queueMetrics.active || 0} color="green" />
              <MetricItem label="Completed" value={queueMetrics.completed || 0} color="teal" />
              <MetricItem label="Failed" value={queueMetrics.failed || 0} color="red" />
              <MetricItem label="Delayed" value={queueMetrics.delayed || 0} color="yellow" />
              <MetricItem label="Total" value={queueMetrics.total || 0} color="gray" />
            </div>
          </MetricsPanel>

          <MetricsPanel
            title="DLQ Statistics"
            icon={<TrendingUp className="w-5 h-5" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <MetricItem label="Total" value={stats?.total || 0} color="gray" />
              <MetricItem label="Pending" value={dlqByStatus.dlq_pending || 0} color="yellow" />
              <MetricItem label="Processing" value={dlqByStatus.dlq_processing || 0} color="blue" />
              <MetricItem label="Failed" value={dlqByStatus.dlq_failed || 0} color="red" />
              <MetricItem label="Resolved" value={dlqByStatus.dlq_resolved || 0} color="green" />
              <MetricItem label="Manual" value={dlqByStatus.dlq_manual || 0} color="purple" />
            </div>
          </MetricsPanel>
        </div>

        {/* Top Errors Section */}
        {stats?.topErrors && stats.topErrors.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Top Error Types</h2>
            </div>
            <div className="space-y-3">
              {stats.topErrors.map((error, idx) => (
                <ErrorItem key={idx} error={error} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemStatusBanner({ circuitState }) {
  const statusConfig = {
    CLOSED: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      message: 'System Healthy - All systems operational'
    },
    OPEN: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      message: 'Circuit Open - System protection activated'
    },
    HALF_OPEN: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      message: 'Circuit Half-Open - Testing recovery'
    },
    UNKNOWN: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      icon: <Clock className="w-5 h-5 text-gray-600" />,
      message: 'Status Unknown - Connecting to backend...'
    }
  };

  const config = statusConfig[circuitState] || statusConfig.UNKNOWN;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 mb-8 flex items-center gap-3`}>
      {config.icon}
      <span className={`${config.text} font-medium`}>{config.message}</span>
    </div>
  );
}

function KPICard({ title, value, icon, status, subtitle }) {
  const statusColors = {
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50'
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  };

  const valueColors = {
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 ${statusColors[status]} p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${statusColors[status]}`}>
          <div className={iconColors[status]}>{icon}</div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${valueColors[status]} mb-1`}>{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function MetricsPanel({ title, icon, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="text-gray-700">{icon}</div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MetricItem({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-75">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ErrorItem({ error }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <code className="text-sm font-mono text-gray-800">{error._id}</code>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{error.count} occurrences</span>
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-red-500 h-2 rounded-full" 
            style={{ width: `${Math.min((error.count / 100) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
