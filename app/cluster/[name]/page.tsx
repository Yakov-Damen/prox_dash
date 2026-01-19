'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Server, Grid, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeStatus } from '@/lib/proxmox';
import { ResourceBar } from '@/components/ResourceBar';
import { StatusBadge } from '@/components/StatusBadge';
import { GradientCard } from '@/components/GradientCard';
import { formatBytes } from '@/lib/status-utils';
import { useCluster } from '@/lib/hooks';



function NodeCard({ node, clusterName }: { node: NodeStatus, clusterName: string }) {
  return (
    <Link href={`/cluster/${encodeURIComponent(clusterName)}/node/${node.node}`} className="block">
      <GradientCard className="group cursor-pointer">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg border border-slate-800/50 transition-colors group-hover:bg-indigo-500/20 group-hover:text-indigo-300", node.status === 'online' ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
              <Server size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 leading-tight group-hover:text-white">{node.node}</h4>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">{node.uptime ? `UP: ${(node.uptime / 3600 / 24).toFixed(1)}d` : 'Offline'}</div>
            </div>
          </div>
          <StatusBadge status={node.status} />
        </div>

        {node.status === 'online' && (
          <div className="space-y-5">
            <div className="space-y-4">
              <ResourceBar 
                label="CPU" 
                percentage={node.cpu * 100}
                displayMain={`${(node.cpu * 100).toFixed(1)}%`}
                displaySub={`${(node.cpu * (node.maxcpu || 0)).toFixed(2)} / ${node.maxcpu} Cores`}
                colorClass="bg-indigo-500" 
              />
              <ResourceBar 
                label="Memory" 
                percentage={(node.mem / node.maxmem) * 100}
                displayMain={`${((node.mem / node.maxmem) * 100).toFixed(1)}%`}
                displaySub={`${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`}
                colorClass="bg-emerald-500" 
              />
              <ResourceBar 
                label="Storage" 
                percentage={(node.disk || 0) / (node.maxdisk || 1) * 100}
                displayMain={`${((node.disk || 0) / (node.maxdisk || 1) * 100).toFixed(1)}%`}
                displaySub={`${formatBytes(node.disk || 0)} / ${formatBytes(node.maxdisk || 1)}`}
                colorClass="bg-amber-500" 
              />
            </div>
            
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-2 group-hover:text-indigo-400">
               <span>View Details & VMs</span>
            </div>
          </div>
        )}
      </GradientCard>
    </Link>
  );
}

export default function ClusterPage() {
  const params = useParams();
  const clusterName = decodeURIComponent(params.name as string);
  
  const { data, loading, error, refresh } = useCluster(clusterName);

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
             <Link href="/" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
               <ArrowLeft size={20} />
             </Link>
             <div>
               <div className="flex items-center gap-3">
                 <h1 className="text-2xl md:text-3xl font-bold text-white">
                   {clusterName}
                 </h1>
                 <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
                   Cluster View
                 </span>
               </div>
               <p className="text-slate-400 mt-1 flex items-center gap-2">
                 <Grid size={14} /> Nodes Overview
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.nodes.map(node => (
              <NodeCard key={node.id} node={node} clusterName={clusterName} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
