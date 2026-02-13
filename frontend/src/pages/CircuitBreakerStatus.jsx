import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import { MainLayout, Card, CardHeader, CardContent, Badge, Skeleton } from '../components';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function CircuitBreakerStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await systemAPI.getHealth();
      setHealth(response.data);

      // Simulate historical data
      setHistory(prev => {
        const failureRate = Math.random() * 100;
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          failureRate: failureRate,
          requestsPerMin: Math.floor(Math.random() * 1000) + 100
        };
        return [...prev.slice(-20), newPoint];
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch health:', error);
      setLoading(false);
    }
  };

  const circuitBreaker = health?.components?.circuitBreaker || {};
  const state = circuitBreaker.state || 'UNKNOWN';
  const failureRate = circuitBreaker.failureRate || 0;
  const threshold = circuitBreaker.threshold || 50;
  const metrics = circuitBreaker.metrics || {};

  const getStatusConfig = () => {
    const configs = {
      CLOSED: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900 dark:text-green-300',
        statusBg: 'bg-green-100 dark:bg-green-800/30',
        statusText: 'text-green-700 dark:text-green-400',
        icon: <CheckCircle2 className="w-16 h-16 text-green-600" />,
        message: 'Circuit Closed - Normal Operation',
        description: 'System is healthy and processing requests normally'
      },
      OPEN: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900 dark:text-red-300',
        statusBg: 'bg-red-100 dark:bg-red-800/30',
        statusText: 'text-red-700 dark:text-red-400',
        icon: <AlertCircle className="w-16 h-16 text-red-600 animate-pulse" />,
        message: 'Circuit Open - System Protection Active',
        description: 'System detected high failure rate and opened circuit to prevent cascading failures'
      },
      HALF_OPEN: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-900 dark:text-amber-300',
        statusBg: 'bg-amber-100 dark:bg-amber-800/30',
        statusText: 'text-amber-700 dark:text-amber-400',
        icon: <AlertTriangle className="w-16 h-16 text-amber-600 animate-pulse" />,
        message: 'Circuit Half-Open - Recovery Phase',
        description: 'System is testing recovery with limited traffic'
      }
    };
    return configs[state] || configs.UNKNOWN;
  };

  const config = getStatusConfig();

  return (
    <MainLayout
      title="Circuit Breaker Status"
      subtitle="Monitor circuit breaker state and failure metrics"
    >
      {/* Main Status Card */}
      <Card className={`mb-8 ${config.bg} border-2 ${config.border}`}>
        <CardContent className="p-8">
          <div className="flex items-center gap-8">
            <div>
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="mb-4">
                <h2 className={`text-3xl font-bold ${config.text} mb-2`}>
                  {config.message}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {config.description}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current State</p>
                  <Badge variant={state === 'CLOSED' ? 'success' : state === 'HALF_OPEN' ? 'warning' : 'danger'}>
                    {state}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Changed</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {circuitBreaker.lastStateChange 
                      ? new Date(circuitBreaker.lastStateChange).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Failure Rate</h3>
              <TrendingDown className={`w-5 h-5 ${failureRate > threshold ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            {loading ? (
              <Skeleton height="h-12" />
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {failureRate.toFixed(2)}%
                </p>
                <p className={`text-sm ${failureRate > threshold ? 'text-red-600' : 'text-green-600'}`}>
                  {failureRate > threshold ? '↑ Above' : '↓ Below'} threshold ({threshold}%)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Total Requests</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            {loading ? (
              <Skeleton height="h-12" />
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {metrics.totalRequests || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Since last reset
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">State Changes</h3>
              <RotateCcw className="w-5 h-5 text-purple-600" />
            </div>
            {loading ? (
              <Skeleton height="h-12" />
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {metrics.stateChanges || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total transitions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Threshold Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold">Failure Rate Threshold</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton height="h-12" />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current: {failureRate.toFixed(2)}%
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Threshold: {threshold}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      failureRate > threshold
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min(failureRate, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className={`text-sm font-bold ${
                    failureRate > threshold ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {failureRate > threshold ? 'WARNING' : 'HEALTHY'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Safe Margin</p>
                  <p className="text-sm font-bold text-blue-600">
                    {Math.max(0, threshold - failureRate).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Risk Level</p>
                  <p className={`text-sm font-bold ${
                    failureRate > threshold * 0.8 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {failureRate > threshold * 0.8 ? 'HIGH' : 'LOW'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Data */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Failure Rate Trend</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton height="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="time" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: `1px solid var(--border-color)`,
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="failureRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Failure Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
