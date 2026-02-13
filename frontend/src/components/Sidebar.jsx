import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  RotateCw,
  AlertCircle,
  Zap,
  Settings,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useState } from 'react';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dlq-messages', icon: MessageSquare, label: 'DLQ Messages' },
    { path: '/retry-logs', icon: RotateCw, label: 'Retry Logs' },
    { path: '/circuit-breaker', icon: AlertCircle, label: 'Circuit Breaker' },
    { path: '/replay-manager', icon: Zap, label: 'Replay Manager' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Sidebar */}
      <aside className={`
        ${isOpen ? 'w-64' : 'w-20'}
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        fixed left-0 top-0 bottom-0 z-30
        transition-all duration-300 flex flex-col
        shadow-sm
      `}>
        {/* Logo Section */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          {isOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-lg font-bold">D</span>
              </div>
              <div className="flex-1">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white">DLQ System</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Management</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg
                  transition-colors duration-200
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }
                `}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
          {isOpen && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              v1.0.0
            </p>
          )}
        </div>
      </aside>

      {/* Content Offset */}
      <div className={`${isOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`} />
    </>
  );
}
