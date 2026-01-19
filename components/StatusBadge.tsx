import { cn } from '@/lib/utils';
import { getStatusColor } from '@/lib/status-utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClasses = getStatusColor(status, 'badge');
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
      colorClasses,
      className
    )}>
      {status}
    </span>
  );
}
