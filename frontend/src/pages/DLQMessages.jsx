import React, { useState, useEffect } from 'react';
import { dlqAPI } from '../services/api';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DLQMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    errorType: '',
    source: ''
  });

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, filters]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await dlqAPI.list(params);
      setMessages(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setLoading(false);
    }
  };

  const handleReplay = async (id) => {
    if (!confirm('Are you sure you want to replay this message?')) return;

    try {
      await dlqAPI.replay(id);
      alert('Message replayed successfully!');
      fetchMessages();
    } catch (error) {
      alert('Failed to replay message: ' + error.message);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">DLQ Messages</h1>
          <p className="text-slate-400">View and manage messages in the Dead Letter Queue</p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Filters</h2>
            </div>
            <button
              onClick={fetchMessages}
              className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-700 text-white"
              >
                <option value="">All Statuses</option>
                <option value="dlq_pending">Pending</option>
                <option value="dlq_processing">Processing</option>
                <option value="dlq_resolved">Resolved</option>
                <option value="dlq_failed">Failed</option>
                <option value="dlq_manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Error Type</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={filters.errorType}
                  onChange={(e) => handleFilterChange('errorType', e.target.value)}
                  placeholder="e.g., TIMEOUT_ERROR"
                  className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-700 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  placeholder="e.g., api"
                  className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-700 text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 font-medium">No messages found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Message ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Error Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Retries
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {messages.map((msg) => (
                      <tr key={msg._id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-blue-400 bg-slate-900 px-2 py-1 rounded">
                            {msg.messageId.substring(0, 12)}...
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-red-400 bg-red-900/20 px-2 py-1 rounded">
                            <XCircle className="w-3 h-3" />
                            {msg.errorType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={msg.status} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300 font-medium">{msg.retryCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {msg.status === 'dlq_pending' && (
                              <button
                                onClick={() => handleReplay(msg._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                <Play className="w-3 h-3" />
                                Replay
                              </button>
                            )}
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors">
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

              {/* Pagination */}
              <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing <span className="font-medium text-white">{messages.length}</span> of{' '}
                  <span className="font-medium text-white">{pagination.total}</span> messages
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-300">
                    Page <span className="font-medium text-white">{pagination.page}</span> of{' '}
                    <span className="font-medium text-white">{pagination.pages}</span>
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    dlq_pending: {
      bg: 'bg-yellow-900/30',
      text: 'text-yellow-400',
      border: 'border-yellow-700',
      icon: <Clock className="w-3 h-3" />,
      label: 'Pending'
    },
    dlq_processing: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-400',
      border: 'border-blue-700',
      icon: <RefreshCw className="w-3 h-3" />,
      label: 'Processing'
    },
    dlq_resolved: {
      bg: 'bg-green-900/30',
      text: 'text-green-400',
      border: 'border-green-700',
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Resolved'
    },
    dlq_failed: {
      bg: 'bg-red-900/30',
      text: 'text-red-400',
      border: 'border-red-700',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Failed'
    },
    dlq_manual: {
      bg: 'bg-purple-900/30',
      text: 'text-purple-400',
      border: 'border-purple-700',
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Manual'
    }
  };

  const config = statusConfig[status] || statusConfig.dlq_pending;

  return (
    <span className={`inline-flex items-center gap-1 ${config.bg} ${config.text} border ${config.border} px-2.5 py-1 rounded-md text-xs font-semibold`}>
      {config.icon}
      {config.label}
    </span>
  );
}
