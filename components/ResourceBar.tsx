import { cn } from '@/lib/utils';

interface ResourceBarProps {
  label: string;
  percentage: number;
  displayMain: string;
  displaySub?: string;
  colorClass?: string;
}

export function ResourceBar({ 
  label, 
  percentage, 
  displayMain, 
  displaySub, 
  colorClass = 'bg-blue-500' 
}: ResourceBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5 text-slate-400">
        <span className="text-xs font-medium">{label}</span>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-200">{displayMain}</span>
          {displaySub && <span className="text-[10px] text-slate-500 ml-1.5">{displaySub}</span>}
        </div>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", colorClass)} 
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
