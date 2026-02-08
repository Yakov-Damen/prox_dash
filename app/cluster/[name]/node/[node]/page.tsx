'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Box, Monitor, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workload } from '@/lib/providers/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ResourceSummaryBanner } from '@/components/ResourceSummaryBanner';
import { useInfraNode, useInfraWorkloads } from '@/lib/hooks';
import { formatBytes, formatBytesPair } from '@/lib/status-utils';

function WorkloadTable({ workloads }: { workloads: Workload[] }) {

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">CPU</th>
              <th className="p-4 font-medium">Memory</th>
              <th className="p-4 font-medium">Uptime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {workloads.map((wl) => (
              <tr key={wl.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-4">
                  <StatusBadge status={wl.status} />
                </td>
                <td className="p-4 text-slate-200 font-medium">
                  {wl.name}
                  <div className="text-xs text-slate-600 font-mono mt-0.5">{wl.id}</div>
                </td>
                <td className="p-4 text-slate-500 text-sm flex items-center gap-2">
                   {(wl.type === 'qemu' || wl.type === 'instance' || wl.type === 'pod') ? <Monitor size={14} /> : <Box size={14} />}
                   <span className="uppercase">{wl.type}</span>
                </td>
                <td className="p-4 text-slate-400 text-sm">
                   {wl.cpu.usage !== undefined ? (
                       <div className="flex flex-col">
                           <span className={cn("font-mono", wl.cpu.usage > 0.8 ? "text-red-400" : "text-slate-300")}>
                               {(wl.cpu.usage * wl.cpu.count).toFixed(2)} / {wl.cpu.count} vCPU
                           </span>
                       </div>
                   ) : (
                       <span className="text-slate-600">{wl.cpu.count} vCPU</span>
                   )}
                </td>
                <td className="p-4 text-slate-400 text-sm">
                   {wl.status === 'running' ? (
                     <div className="flex flex-col">
                       <span className="text-slate-300">
                         {wl.memory.used ? formatBytesPair(wl.memory.used, wl.memory.total) : formatBytes(wl.memory.total)}
                       </span>
                     </div>
                   ) : (
                       <span className="text-slate-600">{formatBytes(wl.memory.total)}</span>
                   )}
                </td>
                <td className="p-4 text-slate-500 text-sm font-mono">
                  {wl.uptime ? (
                     <span className="flex items-center gap-1.5">
                       <Clock size={12} />
                       {(wl.uptime / 3600).toFixed(1)}h
                     </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
            
            {workloads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  No workloads found on this node.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NodePage() {
  const params = useParams();
  const clusterName = decodeURIComponent(params.name as string);
  const nodeName = decodeURIComponent(params.node as string);
  
  const { data: nodeData, loading: nodeLoading, refresh: refreshNode } = useInfraNode(clusterName, nodeName);
  const { data: workloads, loading: workloadsLoading, refresh: refreshWorkloads } = useInfraWorkloads(clusterName, nodeName);

  const loading = nodeLoading || workloadsLoading;
  
  const refreshAll = () => {
    refreshNode();
    refreshWorkloads();
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
             <Link href={`/cluster/${encodeURIComponent(clusterName)}`} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
               <ArrowLeft size={20} />
             </Link>
             <div>
               <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                 <Link href="/" className="hover:text-indigo-400 transition-colors">Clusters</Link>
                 <span>/</span>
                 <Link href={`/cluster/${encodeURIComponent(clusterName)}`} className="hover:text-indigo-400 transition-colors">{clusterName}</Link>
               </div>
               <div className="flex items-center gap-3">
                 <h1 className="text-2xl md:text-3xl font-bold text-white">
                   {nodeName}
                 </h1>
                 {nodeData && <StatusBadge status={nodeData.status} />}
               </div>
             </div>
          </div>
          
          <button 
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {/* Node Resource Banner */}
        {nodeData && (
           <ResourceSummaryBanner 
             title={`${nodeName} Overview`}
             cpu={{
               total: nodeData.cpu?.total || 0,
               used: nodeData.cpu?.used || 0,
               percentage: nodeData.cpu?.percentage || 0
             }}
             memory={{
               total: nodeData.memory?.total || 0,
               used: nodeData.memory?.used || 0,
               percentage: nodeData.memory?.percentage || 0
             }}
             storage={nodeData.storage ? {
               total: nodeData.storage.total || 0,
               used: nodeData.storage.used || 0,
               percentage: nodeData.storage.percentage || 0
             } : undefined}
             systemInfo={{
               name: nodeData.name || nodeName,
               kernel: nodeData.providerData?.kernelVersion,
               os: nodeData.providerData?.osImage,
               cpuModel: nodeData.providerData?.cpuModel,
               manufacturer: nodeData.providerData?.manufacturer,
               productName: nodeData.providerData?.productName,
               uptime: nodeData.uptime
             }}
             entityCount={workloads ? workloads.length : 0}
             entityLabel="Workloads"
           />
        )}

        {/* Workload List */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             <Monitor size={20} className="text-indigo-400" />
             Workloads
             <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
               {workloads ? workloads.length : 0}
             </span>
          </h2>
          
          {loading && (!workloads || workloads.length === 0) ? (
             <div className="flex justify-center py-20 text-slate-500">
                <RefreshCw size={30} className="animate-spin mb-2 opacity-50" />
             </div>
          ) : (
             <WorkloadTable workloads={workloads || []} />
          )}
        </div>
      </div>
    </main>
  );
}
