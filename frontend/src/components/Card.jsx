export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-card rounded-lg border border-current border-opacity-10 shadow-soft ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-current border-opacity-10 ${className}`}
      style={{ borderColor: 'var(--border-color)' }}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}
