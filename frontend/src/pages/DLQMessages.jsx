import React, { useState, useEffect } from 'react';
import { dlqAPI } from '../services/api';

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
      
      // Remove empty filters
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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">DLQ Messages</h1>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:border-white/40"
              >
                <option value="">All</option>
                <option value="dlq_pending">Pending</option>
                <option value="dlq_processing">Processing</option>
                <option value="dlq_resolved">Resolved</option>
                <option value="dlq_failed">Failed</option>
                <option value="dlq_manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Error Type</label>
              <input
                type="text"
                value={filters.errorType}
                onChange={(e) => handleFilterChange('errorType', e.target.value)}
                placeholder="e.g., TIMEOUT_ERROR"
                className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:border-white/40 placeholder-white/40"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Source</label>
              <input
                type="text"
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                placeholder="e.g., api"
                className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:border-white/40 placeholder-white/40"
              />
            </div>
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-white/60">No messages found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Message ID</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Error Type</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Retries</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Created</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg._id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-6 py-4">
                          <span className="text-white font-mono text-sm">{msg.messageId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-orange-300 text-sm">{msg.errorType}</span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={msg.status} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white/80">{msg.retryCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white/60 text-sm">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {msg.status === 'dlq_pending' && (
                            <button
                              onClick={() => handleReplay(msg._id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                              Replay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 bg-white/5 flex items-center justify-between">
                <div className="text-white/60 text-sm">
                  Showing {messages.length} of {pagination.total} messages
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-white">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition"
                  >
                    Next
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
  const colors = {
    dlq_pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    dlq_processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dlq_resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
    dlq_failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    dlq_manual: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status.replace('dlq_', '').toUpperCase()}
    </span>
  );
}
