import { cn } from '@/lib/utils';

interface ResourceBarProps {
  label: string;
  percentage: number;
  displayMain: string;
  displaySub?: string;
  colorClass: string;
}

export function ResourceBar({
  label,
  percentage,
  displayMain,
  displaySub,
  colorClass,
}: ResourceBarProps) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">{label}</span>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-200 font-mono">{displayMain}</span>
          {displaySub && (
            <span className="text-[10px] text-slate-500 ml-1.5 font-mono opacity-70">
              {displaySub}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
