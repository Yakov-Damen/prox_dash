import Link from 'next/link';
import { Activity, Cpu, LayoutGrid, Database, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterStatus } from '@/lib/providers/types';
import { GradientCard } from '@/components/GradientCard';
import { formatBytesPair } from '@/lib/status-utils';

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


        <div className="mt-auto">
          <div className="grid grid-cols-2 gap-6 divide-x divide-slate-800/50">
             <div className="px-4 first:pl-0">
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Cpu size={12} /> CPU
                </div>
                <div className="text-2xl font-bold text-slate-200">
                  {cpuUsageAvg.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{(cpuUsageAvg / 100 * totalCores).toFixed(0)} / {totalCores} Cores</div>
             </div>
             
             <div className="px-4">
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Activity size={12} /> RAM
                </div>
                <div className="text-2xl font-bold text-slate-200">
                  {memUsagePercent.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{formatBytesPair(usedMem, totalMem)}</div>
             </div>
          </div>

           {cluster.storage && (
             <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                     <Database size={14} className="text-violet-400" />
                     <span className="text-violet-200/70">Ceph Storage</span>
                   </div>
                   {cluster.storage.usage && (
                     <div className="flex items-center gap-2 relative group-hover:scale-105 transition-transform duration-300">
                        {/* Mini Progress Bar for Storage */}
                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                           <div 
                             className={cn("h-full rounded-full",
                               (cluster.storage.usage.used / cluster.storage.usage.total) > 0.8 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                               (cluster.storage.usage.used / cluster.storage.usage.total) > 0.6 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                               "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                             )}
                             style={{ width: `${(cluster.storage.usage.used / cluster.storage.usage.total) * 100}%` }}
                           />
                        </div>
                        <span className="text-sm font-bold font-mono text-violet-300 neon-text-glow">
                          {Math.round((cluster.storage.usage.used / cluster.storage.usage.total) * 100)}%
                        </span>
                     </div>
                   )}
                </div>

                 <div className={cn("px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border", 
                   cluster.storage.health === 'HEALTH_OK' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                   cluster.storage.health === 'HEALTH_WARN' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
                   "bg-red-500/10 border-red-500/20 text-red-400"
                 )}>
                   {cluster.storage.health === 'HEALTH_OK' ? 'healthy' : 
                    cluster.storage.health === 'HEALTH_WARN' ? 'warning' : 'critical'}
                 </div>
             </div>
           )}
        </div>
      </GradientCard>
    </Link>
  );
}
