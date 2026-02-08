'use client';

import { Cpu, Server, HardDrive, Database, Activity, Box, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes, formatBytesPair } from '@/lib/status-utils';

interface ResourceMetricProps {
  total: number;
  used: number;
  percentage: number;
}

interface CephMetricProps {
  health: string;
  usage?: {
    total: number;
    used: number;
  };
}

interface SystemInfoProps {
  name: string;
  kernel?: string;
  os?: string;
  uptime?: number;
  cpuModel?: string;
  productName?: string;
  manufacturer?: string;
}

interface ResourceSummaryBannerProps {
  title: string;
  cpu: ResourceMetricProps;
  memory: ResourceMetricProps;
  storage?: ResourceMetricProps;
  ceph?: CephMetricProps;
  systemInfo?: SystemInfoProps;
  entityCount?: number;
  entityLabel?: string;
}

export function ResourceSummaryBanner({
  title,
  cpu,
  memory,
  storage,
  ceph,
  systemInfo,
  entityCount,
  entityLabel = "Nodes"
}: ResourceSummaryBannerProps) {
  
  // Calculate stroke dashoffset for circular progress
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  
  const getStrokeDashoffset = (percentage: number) => {
    return circumference - (percentage / 100) * circumference;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage > 90) return "text-red-400";
    if (percentage > 75) return "text-amber-400";
    return "text-emerald-400";
  };

  const getStrokeColor = (percentage: number) => {
    if (percentage > 90) return "stroke-red-500";
    if (percentage > 75) return "stroke-amber-500";
    return "stroke-emerald-500";
  };
  
  const getCephColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'health_ok': return 'text-emerald-400';
      case 'health_warn': return 'text-amber-400';
      case 'health_err': return 'text-red-400'; 
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 backdrop-blur-sm rounded-xl p-4 md:p-6 mb-8 shadow-xl relative overflow-hidden group">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Title Section */}
        <div className="lg:col-span-3 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
          <h2 className="text-xl font-bold text-white font-display tracking-wide flex items-center gap-2">
            <Activity size={20} className="text-indigo-400" />
            {title}
          </h2>
          
          {systemInfo && (
            <div className="mt-2 text-sm space-y-1">
               <div className="flex items-center gap-2 text-slate-300">
                  <Server size={14} className="text-slate-500" />
                  <span className="font-mono">{systemInfo.name}</span>
               </div>
               {systemInfo.os && (
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="opacity-70">OS:</span> {systemInfo.os}
                 </div>
               )}
               {systemInfo.kernel && (
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="opacity-70">Kernel:</span> {systemInfo.kernel}
                 </div>
               )}
               {systemInfo.cpuModel && (
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="opacity-70">CPU:</span> {systemInfo.cpuModel}
                 </div>
               )}
                {(systemInfo.manufacturer || systemInfo.productName) && (
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="opacity-70">Model:</span> {[systemInfo.manufacturer, systemInfo.productName].filter(Boolean).join(' ')}
                 </div>
               )}
               {systemInfo.uptime && (
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="opacity-70">Up:</span> {(systemInfo.uptime / 3600).toFixed(1)}h
                 </div>
               )}
            </div>
          )}

          {!systemInfo && (
              <p className="text-slate-400 text-sm mt-1">Resource Overview</p>
          )}

          {entityCount !== undefined && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
              <span className="text-2xl font-bold text-white">{entityCount}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{entityLabel}</span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CPU Metric */}
          <div className="bg-slate-900/40 rounded-lg p-4 flex items-center gap-4 border border-slate-800/50 hover:border-slate-700 transition-colors">
            <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
               <svg className="w-full h-full -rotate-90">
                 <circle cx="28" cy="28" r={radius} className="stroke-slate-800" strokeWidth="4" fill="none" />
                 <circle 
                    cx="28" cy="28" r={radius} 
                    className={getStrokeColor(cpu.percentage)} 
                    strokeWidth="4" fill="none" 
                    strokeDasharray={circumference}
                    strokeDashoffset={getStrokeDashoffset(cpu.percentage)}
                    strokeLinecap="round"
                 />
               </svg>
               <Cpu size={18} className="absolute text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-slate-400">Cpu</span>
                <span className={cn("text-lg font-bold", getStatusColor(cpu.percentage))}>
                  {cpu.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono truncate">
                {cpu.used.toFixed(1)} / {cpu.total} Cores
              </div>
            </div>
          </div>

          {/* Memory Metric */}
          <div className="bg-slate-900/40 rounded-lg p-4 flex items-center gap-4 border border-slate-800/50 hover:border-slate-700 transition-colors">
             <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
               <svg className="w-full h-full -rotate-90">
                 <circle cx="28" cy="28" r={radius} className="stroke-slate-800" strokeWidth="4" fill="none" />
                 <circle 
                    cx="28" cy="28" r={radius} 
                    className={getStrokeColor(memory.percentage)} 
                    strokeWidth="4" fill="none" 
                    strokeDasharray={circumference}
                    strokeDashoffset={getStrokeDashoffset(memory.percentage)}
                    strokeLinecap="round"
                 />
               </svg>
               <Box size={18} className="absolute text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-slate-400">Memory</span>
                <span className={cn("text-lg font-bold", getStatusColor(memory.percentage))}>
                  {memory.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono truncate">
                {formatBytesPair(memory.used, memory.total)}
              </div>
            </div>
          </div>

          {/* Storage / Ceph Metric */}
          {ceph ? (
             <div className="bg-slate-900/40 rounded-lg p-4 flex items-center gap-4 border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0 bg-slate-800/50 rounded-full">
                  <Database size={22} className={getCephColor(ceph.health)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-slate-400">Ceph</span>
                    <span className={cn("text-lg font-bold font-mono tracking-tight", getCephColor(ceph.health))}>
                      {ceph.health}
                    </span>
                  </div>
                  {ceph.usage && (
                    <div className="text-xs text-slate-500 font-mono truncate">
                       {formatBytes(ceph.usage.used)} used
                    </div>
                  )}
                </div>
             </div>
          ) : storage ? (
             <div className="bg-slate-900/40 rounded-lg p-4 flex items-center gap-4 border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                   <svg className="w-full h-full -rotate-90">
                     <circle cx="28" cy="28" r={radius} className="stroke-slate-800" strokeWidth="4" fill="none" />
                     <circle 
                        cx="28" cy="28" r={radius} 
                        className={getStrokeColor(storage.percentage)} 
                        strokeWidth="4" fill="none" 
                        strokeDasharray={circumference}
                        strokeDashoffset={getStrokeDashoffset(storage.percentage)}
                        strokeLinecap="round"
                     />
                   </svg>
                   <HardDrive size={18} className="absolute text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-slate-400">Storage</span>
                    <span className={cn("text-lg font-bold", getStatusColor(storage.percentage))}>
                      {storage.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {formatBytesPair(storage.used, storage.total)}
                  </div>
                </div>
             </div>
          ) : (
            <div className="bg-slate-900/20 rounded-lg p-4 flex items-center justify-center gap-2 border border-slate-800/30 border-dashed text-slate-600">
               <Info size={16} />
               <span className="text-sm">No Storage Data</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
