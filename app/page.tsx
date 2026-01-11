'use client';

import { useEffect, useState } from 'react';
import { Activity, Server, Cpu, HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterStatus, NodeStatus } from '@/lib/proxmox';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- Components ---

function ResourceBar({ label, percentage, displayMain, displaySub, colorClass = 'bg-blue-500' }: { 
  label: string, 
  percentage: number, 
  displayMain: string, 
  displaySub?: string,
  colorClass?: string 
}) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5 text-slate-400">
        <span className="text-xs font-medium">{label}</span>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-200">{displayMain}</span>
          {displaySub && <span className="text-[10px] text-slate-500 ml-1.5">{displaySub}</span>}
        </div>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", colorClass)} 
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOnline = status === 'online';
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
      isOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
    )}>
      {status}
    </span>
  );
}

function NodeCard({ node }: { node: NodeStatus }) {
  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition-colors shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg border border-slate-800/50", node.status === 'online' ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-500")}>
            <Server size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 leading-tight">{node.node}</h4>
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
               displayMain={formatBytes(node.mem)}
               displaySub={`/ ${formatBytes(node.maxmem)}`}
               colorClass="bg-emerald-500" 
             />
             <ResourceBar 
               label="Storage" 
               percentage={(node.disk || 0) / (node.maxdisk || 1) * 100}
               displayMain={formatBytes(node.disk || 0)}
               displaySub={`/ ${formatBytes(node.maxdisk || 0)}`}
               colorClass="bg-amber-500" 
             />
          </div>
          
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 space-y-1">
            {(node.manufacturer || node.productName) && (
              <div className="flex justify-between gap-2 text-indigo-300">
                 <span className="shrink-0 font-medium">Model:</span>
                 <span className="truncate text-right">{[node.manufacturer, node.productName].filter(Boolean).join(' ')}</span>
              </div>
            )}
            {node.cpuModel && (
              <div className="flex justify-between gap-2" title={node.cpuModel}>
                 <span className="shrink-0">CPU:</span>
                 <span className="text-slate-400 truncate text-right">{node.cpuModel}</span>
              </div>
            )}
             {node.kernelVersion && (
              <div className="flex justify-between gap-2">
                 <span>Kernel:</span>
                 <span className="text-slate-400">{node.kernelVersion}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClusterSection({ cluster }: { cluster: ClusterStatus }) {
  // Calculate aggregates
  const totalNodes = cluster.nodes.length;
  const onlineNodes = cluster.nodes.filter(n => n.status === 'online').length;
  const totalCPU = cluster.nodes.reduce((acc, n) => acc + (n.cpu * (n.maxcpu || 0)), 0); // Approx usage
  const totalMaxCPU = cluster.nodes.reduce((acc, n) => acc + (n.maxcpu || 0), 0);
  
  // This CPU calc is tricky because `n.cpu` is usage percentage (0.0-1.0) of 1 core usually? Or of total?
  // Proxmox API `cpu` is usually 0.0 to 1.0 (load average normalized? or percentage?)
  // Actually usually it's load. Let's assume percentage for now or verify later.
  
  if (cluster.error) {
    return (
      <div className="mb-8 border border-red-500/20 bg-red-500/5 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-400 mb-2">
           <AlertCircle size={20} />
           <h2 className="text-xl font-bold">{cluster.name}</h2>
        </div>
        <p className="text-red-300 text-sm">{cluster.error}</p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          {cluster.name}
          <span className="text-sm font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            {onlineNodes} / {totalNodes} Online
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cluster.nodes.map(node => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<ClusterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proxmox');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Proxmox Central
            </h1>
            <p className="text-slate-400 mt-1">Unified Infrastructure Monitoring</p>
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
             <p>Connecting to clusters...</p>
           </div>
        ) : (
          <div className="space-y-2">
             {data.length === 0 && !loading && (
                 <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400">No clusters configured or found.</p>
                    <p className="text-sm text-slate-600 mt-2">Check <code>proxmox_config.json</code></p>
                 </div>
             )}
             {data.map((cluster, idx) => (
               <ClusterSection key={idx} cluster={cluster} />
             ))}
          </div>
        )}
      </div>
    </main>
  );
}
