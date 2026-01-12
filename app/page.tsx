'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Server, Cpu, HardDrive, RefreshCw, AlertCircle, ArrowRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterStatus } from '@/lib/proxmox';

function ClusterSummaryCard({ cluster }: { cluster: ClusterStatus }) {
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

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Hack to start at GB
    const gBytes = bytes / Math.pow(1024, 3);
    if (gBytes < 1024) return gBytes.toFixed(1) + ' GB';
    return (gBytes / 1024).toFixed(1) + ' TB';
  };

  return (
    <Link href={`/cluster/${encodeURIComponent(cluster.name)}`} className="block group">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-lg shadow-black/20 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">{cluster.name}</h3>
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
              <div className="text-xs text-slate-500">{totalCores} Cores</div>
           </div>
           
           <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                <Activity size={14} /> Mem Usage
              </div>
              <div className="text-lg font-bold text-slate-200">
                {memUsagePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">{formatBytes(usedMem)} / {formatBytes(totalMem)}</div>
           </div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<ClusterStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proxmox');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

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
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {loading && data.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <RefreshCw size={40} className="animate-spin mb-4 opacity-50" />
             <p>Scanning clusters...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {data.length === 0 && !loading && (
                 <div className="col-span-full text-center py-20 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400">No clusters found.</p>
                 </div>
             )}
             {data.map((cluster, idx) => (
               <ClusterSummaryCard key={idx} cluster={cluster} />
             ))}
          </div>
        )}
      </div>
    </main>
  );
}
