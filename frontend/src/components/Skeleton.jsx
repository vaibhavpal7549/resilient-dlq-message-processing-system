export function Skeleton({ className = '', width = 'w-full', height = 'h-4' }) {
  return (
    <div className={`
      ${width} ${height}
      bg-gray-200 dark:bg-gray-700
      rounded animate-pulse
      ${className}
    `} />
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton width="w-12" height="h-12" className="rounded" />
        <Skeleton width="w-16" height="h-5" />
      </div>
      <Skeleton width="w-32" height="h-3" />
      <Skeleton width="w-24" height="h-8" />
      <Skeleton width="w-40" height="h-3" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton height="h-4" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <Skeleton width="w-1/2" height="h-5" />
      <Skeleton />
      <Skeleton />
      <Skeleton width="w-3/4" />
    </div>
  );
}
