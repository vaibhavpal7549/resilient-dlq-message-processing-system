import React, { useState, useEffect } from 'react';
import { dlqAPI } from '../services/api';
import { MainLayout, Card, CardHeader, CardContent, Button, Badge, Modal, Skeleton } from '../components';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Trash2,
  Filter,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export default function ReplayManager() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [stats, setStats] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [replayType, setReplayType] = useState(''); // 'all' or 'selected'
  const [isReplaying, setIsReplaying] = useState(false);
  const [filters, setFilters] = useState({ status: 'dlq_pending' });

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [filters]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status,
        limit: 50,
        page: 1
      };

      const [messagesRes, statsRes] = await Promise.all([
        dlqAPI.list(params),
        dlqAPI.getStats()
      ]);

      setMessages(messagesRes.data.data || []);
      setStats(statsRes.data.stats?.byStatus || {});
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setLoading(false);
    }
  };

  const handleSelectMessage = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m._id)));
    }
  };

  const handleReplayAll = () => {
    setReplayType('all');
    setShowConfirmModal(true);
  };

  const handleReplaySelected = () => {
    if (selectedMessages.size === 0) {
      alert('Please select at least one message');
      return;
    }
    setReplayType('selected');
    setShowConfirmModal(true);
  };

  const confirmReplay = async () => {
    try {
      setIsReplaying(true);
      
      if (replayType === 'all') {
        // Replay all pending messages
        const ids = messages.map(m => m._id);
        await dlqAPI.replayBatch({ messageIds: ids });
      } else {
        // Replay selected messages
        const ids = Array.from(selectedMessages);
        await dlqAPI.replayBatch({ messageIds: ids });
      }

      alert('Messages queued for replay!');
      setShowConfirmModal(false);
      setSelectedMessages(new Set());
      await fetchMessages();
    } catch (error) {
      alert('Failed to replay messages: ' + error.message);
    } finally {
      setIsReplaying(false);
    }
  };

  const totalMessages = messages.length;
  const selectedCount = selectedMessages.size;

  return (
    <MainLayout
      title="Replay Manager"
      subtitle="Replay messages from Dead Letter Queue"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Replay</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.dlq_pending || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Messages ready for replay</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Successfully Replayed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.dlq_resolved || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Recovered messages</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold">Replay Actions</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="primary"
                onClick={handleReplayAll}
                disabled={totalMessages === 0 || isReplaying}
              >
                <Zap className="w-5 h-5" />
                Replay All ({totalMessages})
              </Button>

              <Button
                variant="primary"
                onClick={handleReplaySelected}
                disabled={selectedCount === 0 || isReplaying}
              >
                <Play className="w-5 h-5" />
                Replay Selected ({selectedCount})
              </Button>
            </div>

            {/* Status Message */}
            {selectedCount > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  {selectedCount} message{selectedCount !== 1 ? 's' : ''} selected for replay
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Messages Ready for Replay</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Status: <Badge variant="warning">Pending</Badge>
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchMessages}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-6 py-4">
                  <Skeleton />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No messages pending replay</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">All messages have been processed successfully</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedMessages.size === messages.length && messages.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Message ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Retry Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {messages.map((msg) => (
                    <tr
                      key={msg._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        selectedMessages.has(msg._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(msg._id)}
                          onChange={() => handleSelectMessage(msg._id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {msg.retryCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(msg.createdAt).toLocaleDateString()}
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Replay"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-300">
                You are about to replay messages
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {replayType === 'all'
                  ? `This will replay all ${totalMessages} pending messages. They will be reprocessed by the system.`
                  : `This will replay ${selectedCount} selected message${selectedCount !== 1 ? 's' : ''}. They will be reprocessed by the system.`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Impact:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Messages will be re-queued for processing</li>
              <li>Processing may take some time</li>
              <li>You can monitor progress in the dashboard</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              disabled={isReplaying}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmReplay}
              disabled={isReplaying}
            >
              {isReplaying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Replaying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Confirm Replay
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
