export function KPICard({ 
  title, 
  value, 
  icon, 
  status = 'default',
  subtitle, 
  trend,
  className = ''
}) {
  const statusConfig = {
    default: {
      bg: 'bg-blue-50',
      darkBg: 'dark:bg-blue-900/20',
      border: 'border-blue-200',
      darkBorder: 'dark:border-blue-700',
      textColor: 'text-blue-900',
      darkText: 'dark:text-blue-300',
      iconBg: 'bg-blue-100',
      darkIconBg: 'dark:bg-blue-800/30'
    },
    success: {
      bg: 'bg-green-50',
      darkBg: 'dark:bg-green-900/20',
      border: 'border-green-200',
      darkBorder: 'dark:border-green-700',
      textColor: 'text-green-900',
      darkText: 'dark:text-green-300',
      iconBg: 'bg-green-100',
      darkIconBg: 'dark:bg-green-800/30'
    },
    warning: {
      bg: 'bg-amber-50',
      darkBg: 'dark:bg-amber-900/20',
      border: 'border-amber-200',
      darkBorder: 'dark:border-amber-700',
      textColor: 'text-amber-900',
      darkText: 'dark:text-amber-300',
      iconBg: 'bg-amber-100',
      darkIconBg: 'dark:bg-amber-800/30'
    },
    error: {
      bg: 'bg-red-50',
      darkBg: 'dark:bg-red-900/20',
      border: 'border-red-200',
      darkBorder: 'dark:border-red-700',
      textColor: 'text-red-900',
      darkText: 'dark:text-red-300',
      iconBg: 'bg-red-100',
      darkIconBg: 'dark:bg-red-800/30'
    },
  };

  const config = statusConfig[status] || statusConfig.default;

  return (
    <div 
      className={`
        rounded-lg border p-6 
        ${config.bg} ${config.darkBg}
        ${config.border} ${config.darkBorder}
        shadow-soft hover:shadow-lg transition-all
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${config.iconBg} ${config.darkIconBg}`}>
          <div className={`w-6 h-6 ${config.textColor} ${config.darkText}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <span className={`text-xs font-bold ${
            trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <p className={`text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider`}>
          {title}
        </p>
        <p className={`text-3xl font-bold ${config.textColor} ${config.darkText}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
