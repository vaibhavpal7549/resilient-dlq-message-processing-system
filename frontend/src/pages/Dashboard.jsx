import React, { useState, useEffect } from 'react';
import { systemAPI, dlqAPI } from '../services/api';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const circuitState = health?.components?.circuitBreaker?.state || 'UNKNOWN';
  const queueMetrics = health?.components?.queue?.metrics || {};
  const dlqByStatus = stats?.byStatus || {};

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          DLQ Management Dashboard
        </h1>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Circuit Breaker"
            value={circuitState}
            color={circuitState === 'CLOSED' ? 'green' : circuitState === 'OPEN' ? 'red' : 'yellow'}
          />
          <StatCard
            title="Queue Depth"
            value={queueMetrics.total || 0}
            color="blue"
          />
          <StatCard
            title="DLQ Pending"
            value={dlqByStatus.dlq_pending || 0}
            color="orange"
          />
          <StatCard
            title="DLQ Resolved"
            value={dlqByStatus.dlq_resolved || 0}
            color="green"
          />
        </div>

        {/* Queue Metrics */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Queue Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricItem label="Waiting" value={queueMetrics.waiting || 0} />
            <MetricItem label="Active" value={queueMetrics.active || 0} />
            <MetricItem label="Completed" value={queueMetrics.completed || 0} />
            <MetricItem label="Failed" value={queueMetrics.failed || 0} />
            <MetricItem label="Delayed" value={queueMetrics.delayed || 0} />
          </div>
        </div>

        {/* DLQ Stats */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">DLQ Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricItem label="Total" value={stats?.total || 0} />
            <MetricItem label="Pending" value={dlqByStatus.dlq_pending || 0} />
            <MetricItem label="Processing" value={dlqByStatus.dlq_processing || 0} />
            <MetricItem label="Failed" value={dlqByStatus.dlq_failed || 0} />
          </div>

          {stats?.topErrors && stats.topErrors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-3">Top Errors</h3>
              <div className="space-y-2">
                {stats.topErrors.map((error, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                    <span className="text-white font-mono text-sm">{error._id}</span>
                    <span className="text-white/80">{error.count} occurrences</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    green: 'from-green-500 to-emerald-600',
    red: 'from-red-500 to-rose-600',
    yellow: 'from-yellow-500 to-amber-600',
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-amber-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-6 shadow-lg`}>
      <h3 className="text-white/80 text-sm font-medium mb-2">{title}</h3>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  );
}

function MetricItem({ label, value }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <p className="text-white/60 text-sm mb-1">{label}</p>
      <p className="text-white text-2xl font-semibold">{value}</p>
    </div>
  );
}
