import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GradientCard({ children, className, onClick }: GradientCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-lg shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}
