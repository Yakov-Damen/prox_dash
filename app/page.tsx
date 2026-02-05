'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAggregatedStatus } from '@/lib/hooks';
import { EnvironmentCard } from '@/components/EnvironmentCard';

export default function DashboardPage() {
  const { data: envStatus, loading, refresh } = useAggregatedStatus();

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-16">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent pb-1">
              Global Monitoring
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Infrastructure Health Overview</p>
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

        {loading && envStatus.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <RefreshCw size={40} className="animate-spin mb-4 opacity-50" />
             <p>Scanning infrastructure...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {envStatus.map((status) => (
               <div key={status.provider} className="h-80">
                 <EnvironmentCard 
                    status={status} 
                    href={`/infrastructure/${status.provider}`}
                 />
               </div>
             ))}
             
             {envStatus.length === 0 && !loading && (
                 <div className="col-span-full text-center py-20 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400">No infrastructure providers configured.</p>
                 </div>
             )}
          </div>
        )}
      </div>
    </main>
  );
}

