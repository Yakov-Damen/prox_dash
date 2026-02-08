import Link from 'next/link';
import { ArrowRight, CheckCircle2, AlertTriangle, Monitor, Server, Database, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
// GradientCard removed
import { AggregatedStatus } from '@/lib/hooks';
// formatBytes removed

interface EnvironmentCardProps {
  status: AggregatedStatus;
  href: string;
}

const ProviderIcons = {
  proxmox: Server,
  kubernetes: Boxes,
  openstack: Database, // Using Database as placeholder for "Cloud"/OpenStack
};

const ProviderLabels = {
  proxmox: 'Proxmox Virtualization',
  kubernetes: 'Kubernetes Clusters',
  openstack: 'OpenStack Cloud',
};

export function EnvironmentCard({ status, href }: EnvironmentCardProps) {
  const isHealthy = status.health === 'healthy';
  const Icon = ProviderIcons[status.provider] || Monitor;
  const label = ProviderLabels[status.provider] || status.provider;

  return (
    <Link href={href} className="block group h-full relative">
      <div className={cn(
        "h-full flex flex-col relative overflow-hidden rounded-2xl transition-all duration-500",
        "bg-[#0a0f1e]/80 backdrop-blur-md border border-white/5",
        "group-hover:border-white/10 group-hover:bg-[#0f1629]/80",
        "shadow-[0_0_20px_-5px_rgba(0,0,0,0.5)]"
      )}>
        {/* Holographic Grid Background */}
        <div className="absolute inset-0 holographic-grid opacity-20 pointer-events-none" />
        
        {/* Animated Glow Gradient */}
        <div className={cn(
          "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-all duration-700 group-hover:opacity-20",
          isHealthy ? "bg-cyan-500" : "bg-red-500"
        )} />

        {/* Content Container */}
        <div className="flex items-start justify-between mb-8 relative z-10 p-6">
          <div className="flex items-center gap-5">
            <div className={cn(
              "relative p-4 rounded-xl transition-all duration-300 group-hover:scale-110",
              isHealthy 
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]" 
                : "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]"
            )}>
              <Icon size={32} strokeWidth={1.5} />
              {/* Corner Accents */}
              <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-current opacity-50" />
              <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-current opacity-50" />
            </div>
            
            <div>
              <h2 className="text-2xl font-display font-medium text-white mb-1 tracking-wide group-hover:text-cyan-200 transition-colors">
                {label}
              </h2>
              <div className={cn(
                "flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-sm w-fit uppercase tracking-wider border",
                isHealthy 
                  ? "bg-cyan-950/30 text-cyan-400 border-cyan-500/30" 
                  : "bg-red-950/30 text-red-400 border-red-500/30"
              )}>
                {isHealthy ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                <span>{isHealthy ? 'System Optimal' : 'Critical Alert'}</span>
              </div>
            </div>
          </div>
          
          <ArrowRight className="text-slate-600 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" size={24} strokeWidth={1.5} />
        </div>

        <div className="mt-auto relative z-10 p-6 pt-0">

          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/5">
            <div className="px-1 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-display">Clusters</div>
              <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                <span className={cn(
                  "text-2xl font-bold font-display", 
                  status.onlineClusters < status.totalClusters ? "text-amber-400" : "text-white neon-text-glow"
                )}>
                  {status.onlineClusters}
                </span>
                <span className="text-slate-600 text-sm font-medium">/ {status.totalClusters}</span>
              </div>
            </div>

            <div className="px-1 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-display">Nodes</div>
              <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                <span className={cn(
                  "text-2xl font-bold font-display", 
                  !isHealthy ? "text-amber-400" : "text-white neon-text-glow"
                )}>
                  {status.onlineNodes}
                </span>
                <span className="text-slate-600 text-sm font-medium">/ {status.totalNodes}</span>
              </div>
            </div>
            
            <div className="px-1 text-center">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-display">CPU</div>
               <div className="text-2xl font-bold text-white font-display neon-text-glow">
                 {status.totalCores > 0 
                   ? `${Math.round((status.usedCores / status.totalCores) * 100)}%` 
                   : '0%'}
               </div>
            </div>

            <div className="px-1 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-display">Memory</div>
              <div className="text-2xl font-bold text-white font-display neon-text-glow">
                {status.totalMemory > 0 
                  ? `${Math.round((status.usedMemory / status.totalMemory) * 100)}%` 
                  : '0%'}
              </div>
            </div>

            <div className="px-1 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-display">Storage</div>
              <div className="text-2xl font-bold text-white font-display neon-text-glow">
                {status.totalStorage > 0 
                  ? `${Math.round((status.usedStorage / status.totalStorage) * 100)}%` 
                  : 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Ceph Status Indicator (Only if present) */}
          {status.cephStatus && (
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                      <Database size={14} className="text-violet-400" />
                      <span className="text-violet-200/70">Ceph Storage</span>
                    </div>
                    {status.totalCephStorage > 0 && (
                      <div className="flex items-center gap-2 relative group-hover:scale-105 transition-transform duration-300">
                         {/* Mini Progress Bar for Ceph */}
                         <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={cn("h-full rounded-full",
                                (status.usedCephStorage / status.totalCephStorage) > 0.8 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                (status.usedCephStorage / status.totalCephStorage) > 0.6 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                              )}
                              style={{ width: `${(status.usedCephStorage / status.totalCephStorage) * 100}%` }}
                            />
                         </div>
                         <span className="text-sm font-bold font-mono text-violet-300 neon-text-glow">
                           {Math.round((status.usedCephStorage / status.totalCephStorage) * 100)}%
                         </span>
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border",
                    status.cephStatus === 'healthy' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    status.cephStatus === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-red-500/10 border-red-500/20 text-red-400"
                  )}>
                    {status.cephStatus}
                  </div>
              </div>
          )}
        </div>
        
        {/* Bottom decorative bar */}
        <div className={cn(
          "absolute bottom-0 left-0 w-full h-[2px]",
          isHealthy 
            ? "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" 
            : "bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
        )} />
      </div>
    </Link>
  );
}
