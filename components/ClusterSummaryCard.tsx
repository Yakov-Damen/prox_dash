import Link from 'next/link';
import { Activity, Cpu, LayoutGrid, Database, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterStatus } from '@/lib/proxmox';
import { GradientCard } from '@/components/GradientCard';
import { formatBytes, formatBytesPair } from '@/lib/status-utils';

export function ClusterSummaryCard({ cluster }: { cluster: ClusterStatus }) {
  const totalNodes = cluster.nodes.length;
  const onlineNodes = cluster.nodes.filter(n => n.status === 'online').length;
  
  // Aggregated Stats
  const totalCores = cluster.nodes.reduce((acc, n) => acc + (n.maxcpu || 0), 0);
  const totalMem = cluster.nodes.reduce((acc, n) => acc + (n.maxmem || 0), 0);
  const usedMem = cluster.nodes.reduce((acc, n) => acc + (n.mem || 0), 0);
  
  const cpuUsageAvg = cluster.nodes.length > 0 
    ? cluster.nodes.reduce((acc, n) => acc + (n.cpu * 100), 0) / cluster.nodes.length 
    : 0;
    
  const memUsagePercent = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

  return (
    <Link href={`/cluster/${encodeURIComponent(cluster.name)}`} className="block group h-full">
      <GradientCard className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
              <LayoutGrid size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">{cluster.name}</h3>
                {cluster.version && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs border border-slate-700 font-mono">
                    v{cluster.version}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", onlineNodes === totalNodes ? "bg-emerald-500" : "bg-amber-500")}></span>
                {onlineNodes} / {totalNodes} Nodes Online
              </p>
            </div>
          </div>
          <ArrowRight className="text-slate-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
        </div>


        <div className="grid grid-cols-2 gap-4 mt-auto">
           <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Cpu size={14} /> CPU Avg
              </div>
              <div className="text-lg font-bold text-slate-200">
                {cpuUsageAvg.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">{(cpuUsageAvg / 100 * totalCores).toFixed(2)} / {totalCores} Cores</div>
           </div>
           
           <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Activity size={14} /> Mem Usage
              </div>
              <div className="text-lg font-bold text-slate-200">
                {memUsagePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">{formatBytesPair(usedMem, totalMem)}</div>
           </div>

           {cluster.ceph && (
             <div className="col-span-2 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                     <Database size={14} /> Ceph Storage
                   </div>
                   <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", 
                     cluster.ceph.health.status === 'HEALTH_OK' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                     cluster.ceph.health.status === 'HEALTH_WARN' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                     "bg-red-500/10 text-red-400 border-red-500/20"
                   )}>
                     {cluster.ceph.health.status.replace('HEALTH_', '')}
                   </div>
                </div>
                {cluster.ceph.usage && (
                  <div className="space-y-1">
                     <div className="flex items-end justify-between">
                        <div className="text-lg font-bold text-slate-200">
                           {((cluster.ceph.usage.used / cluster.ceph.usage.total) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500 mb-1">
                           {formatBytes(cluster.ceph.usage.used)} / {formatBytes(cluster.ceph.usage.total)}
                        </div>
                     </div>
                     <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                           className={cn("h-full rounded-full transition-all duration-500", 
                              cluster.ceph.health.status === 'HEALTH_OK' ? "bg-emerald-500" : 
                              cluster.ceph.health.status === 'HEALTH_WARN' ? "bg-amber-500" : "bg-red-500"
                           )}
                           style={{ width: `${(cluster.ceph.usage.used / cluster.ceph.usage.total) * 100}%` }}
                        />
                     </div>
                  </div>
                )}
             </div>
           )}
        </div>
      </GradientCard>
    </Link>
  );
}
