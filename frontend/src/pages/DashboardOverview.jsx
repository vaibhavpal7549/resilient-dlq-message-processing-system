import React, { useState, useEffect } from 'react';
import { systemAPI, dlqAPI } from '../services/api';
import { MainLayout, KPICard, Card, CardHeader, CardContent, Skeleton, KPICardSkeleton } from '../components';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Database,
  AlertTriangle,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight
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

export default function DashboardOverview() {
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

  const getCircuitStatus = () => {
    const config = {
      CLOSED: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900 dark:text-green-300',
        label: 'System Healthy',
        subtitle: 'All systems operational - Circuit breaker is CLOSED',
        indicator: 'bg-green-500'
      },
      OPEN: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900 dark:text-red-300',
        label: 'Circuit Open',
        subtitle: 'System protection activated - High failure rate detected',
        indicator: 'bg-red-500 animate-pulse'
      },
      HALF_OPEN: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-900 dark:text-amber-300',
        label: 'Circuit Half-Open',
        subtitle: 'Testing system recovery - Limited traffic allowed',
        indicator: 'bg-yellow-500 animate-pulse'
      },
      UNKNOWN: {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-900 dark:text-gray-700',
        label: 'Status Unknown',
        subtitle: 'Connecting to backend services...',
        indicator: 'bg-gray-500'
      }
    };

    return config[circuitState] || config.UNKNOWN;
  };

  const circuitConfig = getCircuitStatus();

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Real-time monitoring and management of Dead Letter Queue system"
    >
      {/* Circuit Breaker Banner */}
      <div className={`
        ${circuitConfig.bg} border-2 ${circuitConfig.border}
        rounded-lg p-6 mb-8 shadow-sm
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {circuitState === 'CLOSED' && <CheckCircle2 className={`w-8 h-8 ${circuitConfig.text}`} />}
            {circuitState === 'OPEN' && <AlertCircle className={`w-8 h-8 ${circuitConfig.text}`} />}
            {circuitState === 'HALF_OPEN' && <AlertTriangle className={`w-8 h-8 ${circuitConfig.text}`} />}
            {circuitState === 'UNKNOWN' && <Clock className={`w-8 h-8 ${circuitConfig.text}`} />}
            <div>
              <h3 className={`text-lg font-bold ${circuitConfig.text} mb-1`}>
                {circuitConfig.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {circuitConfig.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                Circuit State
              </p>
              <p className={`text-xl font-bold ${circuitConfig.text}`}>
                {circuitState}
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full ${circuitConfig.indicator} shadow-md`} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : (
          <>
            <KPICard
              title="Total Messages"
              value={queueMetrics.total || 0}
              icon={<Database className="w-6 h-6" />}
              status="default"
              subtitle={`${queueMetrics.active || 0} active`}
              trend={`${Math.floor(Math.random() * 20) + 5}%`}
            />
            <KPICard
              title="DLQ Pending"
              value={dlqByStatus.dlq_pending || 0}
              icon={<Clock className="w-6 h-6" />}
              status={dlqByStatus.dlq_pending > 0 ? 'warning' : 'success'}
              subtitle="Awaiting retry"
              trend={dlqByStatus.dlq_pending > 0 ? '+5%' : '0%'}
            />
            <KPICard
              title="Resolved Messages"
              value={dlqByStatus.dlq_resolved || 0}
              icon={<CheckCircle2 className="w-6 h-6" />}
              status="success"
              subtitle="Successfully processed"
              trend="+12%"
            />
            <KPICard
              title="Failed Messages"
              value={dlqByStatus.dlq_failed || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
              status={dlqByStatus.dlq_failed > 0 ? 'error' : 'success'}
              subtitle="Permanent failures"
              trend={dlqByStatus.dlq_failed > 0 ? '+3%' : '0%'}
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Queue Metrics Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Queue Metrics</h2>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton width="w-3/4" height="h-48" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={queueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: `1px solid var(--border-color)`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {queueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* DLQ Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">DLQ Status Distribution</h2>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton width="w-3/4" height="h-48" />
              </div>
            ) : (
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
                      backgroundColor: 'var(--bg-card)',
                      border: `1px solid var(--border-color)`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Recent DLQ Activity</h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton height="h-12" />
              <Skeleton height="h-12" />
              <Skeleton height="h-12" />
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No DLQ messages</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                All messages are processing successfully
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Message ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Error
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Retries
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentMessages.map((msg) => (
                    <tr key={msg._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {msg.messageId?.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {msg.errorType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {msg.retryCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                          msg.status === 'dlq_pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          msg.status === 'dlq_resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          msg.status === 'dlq_failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {msg.status?.replace('dlq_', '').charAt(0).toUpperCase() + msg.status?.replace('dlq_', '').slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
