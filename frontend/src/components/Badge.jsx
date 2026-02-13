export function Badge({ children, variant = 'default', className = '', ...props }) {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }) {
  const statusConfig = {
    dlq_pending: {
      variant: 'warning',
      label: 'Pending'
    },
    dlq_processing: {
      variant: 'info',
      label: 'Processing'
    },
    dlq_resolved: {
      variant: 'success',
      label: 'Resolved'
    },
    dlq_failed: {
      variant: 'danger',
      label: 'Failed'
    },
    dlq_manual: {
      variant: 'default',
      label: 'Manual'
    }
  };

  const config = statusConfig[status] || statusConfig.dlq_pending;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
