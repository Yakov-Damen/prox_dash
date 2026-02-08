'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Grid, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeCard } from '@/components/NodeCard';
import { ResourceSummaryBanner } from '@/components/ResourceSummaryBanner';
import { useInfraCluster } from '@/lib/hooks';

export default function ClusterPage() {
  const params = useParams();
  const clusterName = decodeURIComponent(params.name as string);
  
  // Use unified hook instead of legacy useCluster
  const { data, loading, error, refresh } = useInfraCluster(clusterName);

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
             <Link href={data?.provider ? `/infrastructure/${data.provider}` : "/"} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
               <ArrowLeft size={20} />
             </Link>
             <div>
               <div className="flex items-center gap-3">
                 <h1 className="text-3xl md:text-4xl font-bold text-white font-display tracking-wide neon-text-glow">
                   {clusterName}
                 </h1>
                 <span className="px-2 py-0.5 rounded-sm bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-widest font-display shadow-[0_0_10px_-3px_rgba(6,182,212,0.3)]">
                   Cluster View
                 </span>
               </div>
               <p className="text-slate-400 mt-1 flex items-center gap-2 font-mono text-sm opacity-70">
                 <Grid size={12} /> NODES_OVERVIEW
               </p>
             </div>
          </div>
          
          <button 
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {loading && !data ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <RefreshCw size={40} className="animate-spin mb-4 opacity-50" />
             <p>Loading cluster data...</p>
           </div>
        ) : error || !data ? (
           <div className="flex flex-col items-center justify-center py-20 text-red-400 border border-red-900/50 bg-red-900/10 rounded-xl">
             <AlertCircle size={40} className="mb-4" />
             <p>Failed to load cluster.</p>
           </div>
        ) : (
          <>
            {/* Summary Banner */}
            {(() => {
              // Calculate aggregates
              const totalCpuCores = data.nodes.reduce((acc, node) => acc + node.cpu.total, 0);
              const usedCpuCores = data.nodes.reduce((acc, node) => acc + node.cpu.used, 0);
              
              const totalMem = data.nodes.reduce((acc, node) => acc + node.memory.total, 0);
              const usedMem = data.nodes.reduce((acc, node) => acc + node.memory.used, 0);
              
              const totalStorage = data.nodes.reduce((acc, node) => acc + (node.storage?.total || 0), 0);
              const usedStorage = data.nodes.reduce((acc, node) => acc + (node.storage?.used || 0), 0);

              // Helper for percentages
              const calcPct = (used: number, total: number) => total > 0 ? (used / total) * 100 : 0;

              // Ceph check
              const isCeph = data.storage?.type === 'ceph';
              const cephData = isCeph && data.storage ? {
                 health: data.storage.health,
                 usage: data.storage.usage ? {
                    total: data.storage.usage.total,
                    used: data.storage.usage.used
                 } : undefined
              } : undefined;

              return (
                <ResourceSummaryBanner 
                  title={`${clusterName} Overview`}
                  cpu={{
                    total: totalCpuCores,
                    used: usedCpuCores,
                    percentage: calcPct(usedCpuCores, totalCpuCores)
                  }}
                  memory={{
                    total: totalMem,
                    used: usedMem,
                    percentage: calcPct(usedMem, totalMem)
                  }}
                  storage={!isCeph ? {
                    total: totalStorage,
                    used: usedStorage,
                    percentage: calcPct(usedStorage, totalStorage)
                  } : undefined}
                  ceph={cephData}
                  entityCount={data.nodes.length}
                  entityLabel="Nodes"
                />
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.nodes.map(node => (
                <NodeCard 
                  key={node.id} 
                  node={node} 
                  clusterName={clusterName}
                  provider={data.provider}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
