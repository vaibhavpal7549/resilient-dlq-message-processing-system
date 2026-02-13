export function Button({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props 
}) {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-900 dark:hover:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600',
  };

  return (
    <button
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
