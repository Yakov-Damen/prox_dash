export function getStatusColor(status: string, variant: 'badge' | 'text' | 'bg' = 'badge'): string {
  const isOnline = status === 'online' || status === 'running';
  const isWarning = status === 'unknown';
  
  if (variant === 'badge') {
    if (isOnline) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (isWarning) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-slate-800 text-slate-500 border border-slate-700"; // Offline/Stopped default to slate for badge
  }
  
  if (variant === 'text') {
    if (isOnline) return "text-emerald-400";
    if (isWarning) return "text-amber-400";
    return "text-slate-500";
  }

  if (variant === 'bg') {
    if (isOnline) return "bg-emerald-500";
    if (isWarning) return "bg-amber-500";
    return "bg-slate-500";
  }

  return "";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
