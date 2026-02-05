'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Grid, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeCard } from '@/components/NodeCard';
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
              <NodeCard 
                key={node.id} 
                node={node} 
                clusterName={clusterName}
                provider={data.provider}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
