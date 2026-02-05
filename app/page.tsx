'use client';


import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInfrastructureNames } from '@/lib/hooks';
import { ClusterStatusWrapper } from '@/components/ClusterStatusWrapper';

export default function DashboardPage() {
  const { data: clusterNames, loading, refresh } = useInfrastructureNames();

  // Handle initial scanning state or empty data
  const isLoadingInitial = loading && (!clusterNames || clusterNames.length === 0);

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-16">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent pb-1">
              Proxmox Central
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Unified Infrastructure Overview</p>
          </div>
          
          <button 
            onClick={() => {
                refresh();
                // We should also trigger re-fetch of children if we could, 
                // but SWR will eventually revalidate. 
                // A Global mutate or context based approach would be better for a "refresh all" button,
                // but for now this refreshes the list at least.
                // Ideally, we'd pass a refresh signal down or use a global SWR cache invalidation.
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {isLoadingInitial ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <RefreshCw size={40} className="animate-spin mb-4 opacity-50" />
             <p>Scanning configuration...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {clusterNames.length === 0 && !loading && (
                 <div className="col-span-full text-center py-20 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400">No clusters found in configuration.</p>
                 </div>
             )}
             {clusterNames.map((name) => (
               <ClusterStatusWrapper key={name} clusterName={name} />
             ))}
          </div>
        )}
      </div>
    </main>
  );
}

