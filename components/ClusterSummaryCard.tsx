import Link from 'next/link';
import { Activity, Cpu, LayoutGrid, Database, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterStatus } from '@/lib/providers/types';
import { GradientCard } from '@/components/GradientCard';
import { formatBytes, formatBytesPair } from '@/lib/status-utils';

export function ClusterSummaryCard({ cluster }: { cluster: ClusterStatus }) {
  const totalNodes = cluster.nodes.length;
  const onlineNodes = cluster.nodes.filter(n => n.status === 'online' || n.status === 'ready').length;
  
  // Aggregated Stats
  const totalCores = cluster.nodes.reduce((acc, n) => acc + (n.cpu.total || 0), 0);
  const totalMem = cluster.nodes.reduce((acc, n) => acc + (n.memory.total || 0), 0);
  const usedMem = cluster.nodes.reduce((acc, n) => acc + (n.memory.used || 0), 0);
  
  const cpuUsageAvg = cluster.nodes.length > 0 
    ? cluster.nodes.reduce((acc, n) => acc + (n.cpu.percentage || 0), 0) / cluster.nodes.length 
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


        <div className="mt-auto grid grid-cols-2 md:grid-cols-3 gap-6 divide-x divide-slate-800/50">
           <div className="px-4 first:pl-0">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Cpu size={12} /> CPU Avg
              </div>
              <div className="text-2xl font-bold text-slate-200">
                {cpuUsageAvg.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{(cpuUsageAvg / 100 * totalCores).toFixed(0)} / {totalCores} Cores</div>
           </div>
           
           <div className="px-4">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Activity size={12} /> DRAM
              </div>
              <div className="text-2xl font-bold text-slate-200">
                {memUsagePercent.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{formatBytesPair(usedMem, totalMem)}</div>
           </div>

           {cluster.storage && (
             <div className="px-4 col-span-2 md:col-span-1 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                     <Database size={12} /> {cluster.storage.type}
                   </div>
                   <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", 
                     cluster.storage.health === 'HEALTH_OK' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                     cluster.storage.health === 'HEALTH_WARN' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                     "bg-red-500/10 text-red-400 border-red-500/20"
                   )}>
                     {cluster.storage.health.replace('HEALTH_', '')}
                   </div>
                </div>
                {cluster.storage.usage && (
                  <div>
                     <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-200">
                           {((cluster.storage.usage.used / cluster.storage.usage.total) * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                           of {formatBytes(cluster.storage.usage.total)}
                        </span>
                     </div>
                     <div className="h-1 w-full bg-slate-800/50 rounded-full overflow-hidden mt-1.5">
                        <div 
                           className={cn("h-full rounded-full transition-all duration-500", 
                              cluster.storage.health === 'HEALTH_OK' ? "bg-emerald-500" : 
                              cluster.storage.health === 'HEALTH_WARN' ? "bg-amber-500" : "bg-red-500"
                           )}
                           style={{ width: `${(cluster.storage.usage.used / cluster.storage.usage.total) * 100}%` }}
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
