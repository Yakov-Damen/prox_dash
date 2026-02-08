'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
// GradientCard removed
import { StatusBadge } from '@/components/StatusBadge';
import { ResourceBar } from '@/components/ResourceBar';
import { formatBytes, formatUptime, formatPercentage, getStatusLabel } from '@/lib/status-utils';
import type { NodeStatus, ProviderType } from '@/lib/providers/types';
import { Clock, Server } from 'lucide-react';

interface NodeCardProps {
  node: NodeStatus;
  clusterName: string;
  provider: ProviderType;
  className?: string;
}

// Get provider-specific metadata to display
// getProviderMetadata removed

export function NodeCard({ node, clusterName, provider, className }: NodeCardProps) {
  // providerMetadata removed

  return (
// NodeCard.tsx implementation
    <Link
      href={`/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(node.name)}`}
      className="block group"
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-300",
        "bg-[#0a0f1e]/60 backdrop-blur-sm border border-white/5",
        "hover:bg-[#0f1629]/80 hover:border-cyan-500/30 hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.2)]",
        className
      )}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 holographic-grid opacity-10 pointer-events-none" />

        <div className="p-5 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800/50 rounded-lg border border-white/5 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                <Server className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-display font-medium text-slate-100 tracking-wide group-hover:text-white transition-colors">{node.name}</h3>
                <p className="text-xs text-slate-500 font-mono tracking-tight">{node.id}</p>
              </div>
            </div>
            <StatusBadge status={getStatusLabel(node.status)} />
          </div>

          {/* Uptime */}
          {node.uptime !== undefined && node.uptime > 0 && (
            <div className="flex items-center gap-2 mb-5 text-xs font-mono text-slate-400">
              <Clock className="h-3 w-3" />
              <span>UPTIME: {formatUptime(node.uptime).toUpperCase()}</span>
            </div>
          )}

          {/* Resource Bars */}
          <div className="space-y-4 mb-5">
            <ResourceBar
              label="CPU"
              percentage={node.cpu.percentage}
              displayMain={formatPercentage(node.cpu.percentage)}
              displaySub={`${node.cpu.total.toFixed(0)} cores`}
              colorClass={
                node.cpu.percentage > 80
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                  : node.cpu.percentage > 60
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
              }
            />
            <ResourceBar
              label="MEM"
              percentage={node.memory.percentage}
              displayMain={formatBytes(node.memory.used)}
              displaySub={formatBytes(node.memory.total)}
              colorClass={
                node.memory.percentage > 80
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                  : node.memory.percentage > 60
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]'
              }
            />
            {node.storage && (
              <ResourceBar
                label="STR"
                percentage={node.storage.percentage}
                displayMain={formatBytes(node.storage.used)}
                displaySub={formatBytes(node.storage.total)}
                colorClass={
                  node.storage.percentage > 80
                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : node.storage.percentage > 60
                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                }
              />
            )}
          </div>

          {/* K8s Conditions Warning */}
          {provider === 'kubernetes' && node.providerData?.conditions && (
            <K8sConditionsWarning conditions={node.providerData.conditions} />
          )}
        </div>
      </div>
    </Link>
  );
}

// Display Kubernetes node conditions if any are not ready
function K8sConditionsWarning({
  conditions,
}: {
  conditions: Array<{ type: string; status: string; message?: string }>;
}) {
  // Find conditions that indicate problems
  const problemConditions = conditions.filter((c) => {
    // Ready should be True
    if (c.type === 'Ready') return c.status !== 'True';
    // Other conditions should be False (MemoryPressure, DiskPressure, etc.)
    return c.status === 'True';
  });

  if (problemConditions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="space-y-1">
        {problemConditions.map((condition) => (
          <div
            key={condition.type}
            className="text-xs p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400"
            title={condition.message}
          >
            {condition.type}: {condition.message || condition.status}
          </div>
        ))}
      </div>
    </div>
  );
}
