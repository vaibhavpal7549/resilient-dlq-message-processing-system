import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Bell } from 'lucide-react';

export function Header({ title, subtitle }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="
      bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
      sticky top-0 z-20 shadow-sm
    ">
      <div className="px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="
            relative p-2 text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-gray-200
            hover:bg-gray-100 dark:hover:bg-gray-800
            rounded-lg transition-colors
          ">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="
              p-2 text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg transition-colors
            "
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">A</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Admin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">System</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
