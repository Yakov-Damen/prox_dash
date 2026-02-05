import Link from 'next/link';
import { ArrowRight, CheckCircle2, AlertTriangle, Monitor, Server, Database, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientCard } from '@/components/GradientCard';
import { AggregatedStatus } from '@/lib/hooks';
import { formatBytes } from '@/lib/status-utils';

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
    <Link href={href} className="block group h-full">
      <GradientCard className="h-full flex flex-col relative overflow-hidden">
        {/* Status Background Glow */}
        <div className={cn(
          "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-colors duration-500",
          isHealthy ? "bg-emerald-500" : "bg-red-500"
        )} />

        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl border transition-colors duration-300",
              isHealthy 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20 group-hover:bg-red-500/20"
            )}>
              <Icon size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 group-hover:text-indigo-200 transition-colors">
                {label}
              </h2>
              <div className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full w-fit",
                isHealthy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}>
                {isHealthy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{isHealthy ? 'Systems Operational' : 'Attention Required'}</span>
              </div>
            </div>
          </div>
          <ArrowRight className="text-slate-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" size={24} />
        </div>

        <div className="mt-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-800/50">
            <div className="px-4 first:pl-0">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Nodes</div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl font-bold", !isHealthy ? "text-amber-400" : "text-white")}>
                  {status.onlineNodes}
                </span>
                <span className="text-slate-600 text-sm font-medium">/ {status.totalNodes}</span>
              </div>
            </div>
            
            <div className="px-4">
               <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">CPU Cores</div>
               <div className="text-2xl font-bold text-white">{status.totalCores}</div>
            </div>

            <div className="px-4">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Memory</div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-2xl font-bold text-white">
                   {status.totalMemory > 0 
                     ? `${Math.round((status.usedMemory / status.totalMemory) * 100)}%` 
                     : '0%'}
                 </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {formatBytes(status.usedMemory)} 
              </div>
            </div>

            <div className="px-4">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Storage</div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-2xl font-bold text-white">
                   {status.totalStorage > 0 
                     ? `${Math.round((status.usedStorage / status.totalStorage) * 100)}%` 
                     : 'N/A'}
                 </span>
              </div>
              {status.totalStorage > 0 && (
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {formatBytes(status.usedStorage)}
                  </div>
              )}
            </div>
          </div>
          
          {/* Ceph Status Indicator (Only if present) */}
          {status.cephStatus && (
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Database size={16} />
                    <span>Ceph Storage</span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                    status.cephStatus === 'healthy' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    status.cephStatus === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-red-500/10 border-red-500/20 text-red-400"
                  )}>
                    {status.cephStatus}
                  </div>
              </div>
          )}
        </div>
      </GradientCard>
    </Link>
  );
}
