import React, { useState } from 'react';
import { MainLayout, Card, CardHeader, CardContent, Button } from '../components';
import { useTheme } from '../context/ThemeContext';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Lock,
  HardDrive,
  RotateCw,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    appName: 'DLQ Management System',
    apiUrl: 'http://localhost:3000',
    refreshInterval: 5000,
    maxRetries: 5,
    retryDelay: 1000,
    circuitBreakerThreshold: 50,
    notifications: {
      email: true,
      slack: false,
      discord: false
    },
    autoRefresh: true,
    debugMode: false
  });

  const [showApiUrl, setShowApiUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNotificationChange = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Settings saved successfully!');
    setIsSaving(false);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      alert('Settings reset to defaults!');
    }
  };

  return (
    <MainLayout
      title="Settings"
      subtitle="Configure system preferences and options"
    >
      {/* General Settings */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">General Settings</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* App Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => handleSettingChange('appName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Base URL
              </label>
              <div className="relative">
                <input
                  type={showApiUrl ? 'text' : 'password'}
                  value={settings.apiUrl}
                  onChange={(e) => handleSettingChange('apiUrl', e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => setShowApiUrl(!showApiUrl)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showApiUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Refresh Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Interval (ms)
                </label>
                <input
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Circuit Breaker Threshold
                </label>
                <input
                  type="number"
                  value={settings.circuitBreakerThreshold}
                  onChange={(e) => handleSettingChange('circuitBreakerThreshold', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Retry Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Retries
                </label>
                <input
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => handleSettingChange('maxRetries', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retry Delay (ms)
                </label>
                <input
                  type="number"
                  value={settings.retryDelay}
                  onChange={(e) => handleSettingChange('retryDelay', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Auto Refresh
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Debug Mode (Shows detailed logs)
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-5 h-5 text-blue-600" /> : <Moon className="w-5 h-5 text-blue-600" />}
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current: {theme === 'light' ? 'Light' : 'Dark'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                {theme === 'light' ? (
                  <>
                    <Moon className="w-4 h-4" />
                    Switch to Dark
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4" />
                    Switch to Light
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your theme preference is automatically saved and will be restored when you return.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={() => handleNotificationChange('email')}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Receive alerts via email</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
              <input
                type="checkbox"
                checked={settings.notifications.slack}
                onChange={() => handleNotificationChange('slack')}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Slack Notifications</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Send alerts to Slack channel</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
              <input
                type="checkbox"
                checked={settings.notifications.discord}
                onChange={() => handleNotificationChange('discord')}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Discord Notifications</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Post alerts to Discord</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">System Information</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Version</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Environment</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Production</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Healthy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={handleReset}
        >
          <RotateCw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </MainLayout>
  );
}
