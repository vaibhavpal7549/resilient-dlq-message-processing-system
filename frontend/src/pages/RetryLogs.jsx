import React, { useState, useEffect } from 'react';
import { MainLayout, Card, CardHeader, CardContent, Badge, Button, Skeleton, TableRowSkeleton } from '../components';
import {
  RotateCw,
  Filter,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export default function RetryLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API when available
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockLogs = Array.from({ length: 15 }).map((_, i) => ({
        id: `retry-${pagination.page}-${i + 1}`,
        messageId: `msg-${Math.random().toString(36).substr(2, 12)}`,
        attemptNumber: Math.floor(Math.random() * 5) + 1,
        status: ['success', 'failed', 'pending'][Math.floor(Math.random() * 3)],
        error: Math.random() > 0.5 ? 'Connection timeout' : null,
        nextRetry: new Date(Date.now() + Math.random() * 86400000),
        timestamp: new Date(Date.now() - Math.random() * 3600000),
      }));

      setLogs(mockLogs);
      setPagination(prev => ({
        ...prev,
        total: 127,
        pages: Math.ceil(127 / prev.limit)
      }));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch retry logs:', error);
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    return status === 'success' ? 'success' : status === 'failed' ? 'danger' : 'warning';
  };

  const successRate = Math.floor(Math.random() * 30) + 70;

  return (
    <MainLayout
      title="Retry Logs"
      subtitle="Monitor and analyze retry attempts for messages"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Retries</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">847</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <RotateCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{successRate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Attempts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">2.3</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ status: e.target.value });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </CardContent>
      </Card>

      {/* Retry Logs Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Retry History</h2>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton width="w-24" />
                    <Skeleton />
                    <Skeleton width="w-20" />
                    <Skeleton width="w-32" />
                    <Skeleton width="w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No retry logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Message ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Attempt #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Next Retry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {log.messageId.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          #{log.attemptNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(log.status)}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {log.nextRetry.toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page <span className="font-medium">{pagination.page}</span> of{' '}
              <span className="font-medium">{pagination.pages || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= (pagination.pages || 1)}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </MainLayout>
  );
}
