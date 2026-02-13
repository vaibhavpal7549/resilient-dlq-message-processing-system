import React, { useState, useEffect } from 'react';
import { dlqAPI } from '../services/api';
import { MainLayout, Card, CardHeader, CardContent, Badge, Button, Modal, Skeleton, TableRowSkeleton } from '../components';
import {
  Search,
  Filter,
  RefreshCw,
  Play,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  CheckCircle2
} from 'lucide-react';

export default function DLQMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    errorType: '',
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');

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
    if (!window.confirm('Are you sure you want to replay this message?')) return;

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

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      handleFilterChange('messageId', searchInput);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      dlq_pending: 'warning',
      dlq_processing: 'info',
      dlq_resolved: 'success',
      dlq_failed: 'danger',
      dlq_manual: 'default'
    };
    return variants[status] || 'default';
  };

  const getStatusLabel = (status) => {
    return status?.replace('dlq_', '').replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <MainLayout
      title="DLQ Messages"
      subtitle="View and manage messages in the Dead Letter Queue"
    >
      {/* Filters Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMessages}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Message ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearch}
                  placeholder="Enter message ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="dlq_pending">Pending</option>
                <option value="dlq_processing">Processing</option>
                <option value="dlq_resolved">Resolved</option>
                <option value="dlq_failed">Failed</option>
                <option value="dlq_manual">Manual</option>
              </select>
            </div>

            {/* Error Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Type
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.errorType}
                  onChange={(e) => handleFilterChange('errorType', e.target.value)}
                  placeholder="e.g., TIMEOUT_ERROR"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Messages</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total: {pagination.total} message{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4">
                  <Skeleton width="w-20" />
                  <Skeleton />
                  <Skeleton />
                  <Skeleton width="w-16" />
                  <Skeleton width="w-24" />
                </div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton width="w-24" />
                    <Skeleton />
                    <Skeleton width="w-20" />
                    <Skeleton width="w-16" />
                    <Skeleton width="w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No messages found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Try adjusting your filters</p>
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
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Retries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {messages.map((msg) => (
                    <tr key={msg._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {msg.messageId?.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {msg.errorType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(msg.status)}>
                          {getStatusLabel(msg.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {msg.retryCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {msg.status === 'dlq_pending' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleReplay(msg._id)}
                              title="Replay this message"
                            >
                              <Play className="w-3 h-3" />
                              <span className="hidden sm:inline">Replay</span>
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedMessage(msg);
                              setShowDetailModal(true);
                            }}
                            title="View details"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {!loading && messages.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{messages.length}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> messages
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
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                Page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.pages || 1}</span>
              </span>
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

      {/* Message Details Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMessage(null);
        }}
        title="Message Details"
        className="max-w-2xl"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Message ID</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">{selectedMessage.messageId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</p>
                <Badge variant={getStatusVariant(selectedMessage.status)} className="mt-1">
                  {getStatusLabel(selectedMessage.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Error Type</p>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{selectedMessage.errorType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Retry Count</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedMessage.retryCount}</p>
              </div>
            </div>

            {selectedMessage.payload && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Payload</p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-xs overflow-auto text-gray-900 dark:text-gray-100 max-h-64">
                  {JSON.stringify(selectedMessage.payload, null, 2)}
                </pre>
              </div>
            )}

            {selectedMessage.error && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Error Details</p>
                <pre className="bg-red-50 dark:bg-red-900/20 p-4 rounded text-xs text-red-700 dark:text-red-300 overflow-auto max-h-64">
                  {selectedMessage.error}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Created {new Date(selectedMessage.createdAt).toLocaleString()}
              </span>
              {selectedMessage.status === 'dlq_pending' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleReplay(selectedMessage._id);
                    setShowDetailModal(false);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Replay Message
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
