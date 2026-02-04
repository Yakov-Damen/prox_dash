'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GradientCard } from '@/components/GradientCard';
import { ProviderBadge } from '@/components/ProviderBadge';
import { ResourceBar } from '@/components/ResourceBar';
import { formatBytes, formatPercentage } from '@/lib/status-utils';
import type { ClusterStatus, ResourceMetric } from '@/lib/providers/types';
import { Server, AlertCircle } from 'lucide-react';

interface ClusterCardProps {
  cluster: ClusterStatus;
  className?: string;
}

// Aggregate resource metrics from all nodes
function aggregateResources(cluster: ClusterStatus): {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  storage?: ResourceMetric;
} {
  const result = {
    cpu: { used: 0, total: 0, percentage: 0 },
    memory: { used: 0, total: 0, percentage: 0 },
    storage: { used: 0, total: 0, percentage: 0 } as ResourceMetric | undefined,
  };

  let hasStorage = false;

  for (const node of cluster.nodes) {
    result.cpu.used += node.cpu.used;
    result.cpu.total += node.cpu.total;
    result.memory.used += node.memory.used;
    result.memory.total += node.memory.total;

    if (node.storage) {
      hasStorage = true;
      if (result.storage) {
        result.storage.used += node.storage.used;
        result.storage.total += node.storage.total;
      }
    }
  }

  // Calculate percentages
  result.cpu.percentage = result.cpu.total > 0
    ? (result.cpu.used / result.cpu.total) * 100
    : 0;
  result.memory.percentage = result.memory.total > 0
    ? (result.memory.used / result.memory.total) * 100
    : 0;

  if (hasStorage && result.storage) {
    result.storage.percentage = result.storage.total > 0
      ? (result.storage.used / result.storage.total) * 100
      : 0;
  } else {
    result.storage = undefined;
  }

  return result;
}

// Count nodes by status
function countNodeStatuses(cluster: ClusterStatus): { online: number; offline: number; total: number } {
  const online = cluster.nodes.filter(
    (n) => n.status === 'online' || n.status === 'ready'
  ).length;
  const total = cluster.nodes.length;
  return { online, offline: total - online, total };
}

export function ClusterCard({ cluster, className }: ClusterCardProps) {
  const resources = aggregateResources(cluster);
  const nodeStats = countNodeStatuses(cluster);

  const hasError = !!cluster.error;

  return (
    <Link href={`/cluster/${encodeURIComponent(cluster.name)}`} className="block">
      <GradientCard className={cn('cursor-pointer', className)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 truncate">
              {cluster.name}
            </h3>
            {cluster.version && (
              <p className="text-xs text-slate-500 mt-0.5">v{cluster.version}</p>
            )}
          </div>
          <ProviderBadge provider={cluster.provider} size="sm" />
        </div>

        {/* Error State */}
        {hasError && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400 truncate">{cluster.error}</span>
          </div>
        )}

        {/* Node Count */}
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-400">
            <span className="text-emerald-400 font-medium">{nodeStats.online}</span>
            {nodeStats.offline > 0 && (
              <span className="text-slate-500"> / {nodeStats.total}</span>
            )}
            {' '}node{nodeStats.total !== 1 ? 's' : ''}
            {nodeStats.offline > 0 && (
              <span className="text-red-400 ml-1">({nodeStats.offline} offline)</span>
            )}
          </span>
        </div>

        {/* Resource Bars */}
        {!hasError && cluster.nodes.length > 0 && (
          <div className="space-y-3">
            <ResourceBar
              label="CPU"
              percentage={resources.cpu.percentage}
              displayMain={formatPercentage(resources.cpu.percentage)}
              displaySub={`${resources.cpu.total.toFixed(0)} cores`}
              colorClass={
                resources.cpu.percentage > 80
                  ? 'bg-red-500'
                  : resources.cpu.percentage > 60
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
              }
            />
            <ResourceBar
              label="Memory"
              percentage={resources.memory.percentage}
              displayMain={formatBytes(resources.memory.used)}
              displaySub={formatBytes(resources.memory.total)}
              colorClass={
                resources.memory.percentage > 80
                  ? 'bg-red-500'
                  : resources.memory.percentage > 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }
            />
            {resources.storage && (
              <ResourceBar
                label="Storage"
                percentage={resources.storage.percentage}
                displayMain={formatBytes(resources.storage.used)}
                displaySub={formatBytes(resources.storage.total)}
                colorClass={
                  resources.storage.percentage > 80
                    ? 'bg-red-500'
                    : resources.storage.percentage > 60
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }
              />
            )}
          </div>
        )}

        {/* Metadata */}
        {cluster.metadata && Object.keys(cluster.metadata).length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap gap-2">
              {Object.entries(cluster.metadata).slice(0, 3).map(([key, value]) => (
                <span
                  key={key}
                  className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400"
                  title={`${key}: ${value}`}
                >
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </GradientCard>
    </Link>
  );
}
