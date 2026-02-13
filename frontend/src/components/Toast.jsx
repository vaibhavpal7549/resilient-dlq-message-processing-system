import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const config = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-800 dark:text-green-300',
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700',
      text: 'text-red-800 dark:text-red-300',
      icon: <AlertCircle className="w-5 h-5" />
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-700',
      text: 'text-amber-800 dark:text-amber-300',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-300',
      icon: <Info className="w-5 h-5" />
    }
  };

  const toastConfig = config[type] || config.success;

  return (
    <div className={`
      fixed bottom-6 right-6 z-50
      ${toastConfig.bg} ${toastConfig.border} ${toastConfig.text}
      border rounded-lg shadow-lg p-4
      flex items-center gap-3 max-w-sm
      animate-pulse-soft
    `}>
      {toastConfig.icon}
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-0 right-0 z-50 space-y-3 p-6">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
