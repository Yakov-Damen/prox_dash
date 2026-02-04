'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GradientCard } from '@/components/GradientCard';
import { StatusBadge } from '@/components/StatusBadge';
import { ResourceBar } from '@/components/ResourceBar';
import { formatBytes, formatUptime, formatPercentage, getStatusLabel } from '@/lib/status-utils';
import type { NodeStatus, ProviderType } from '@/lib/providers/types';
import { Clock, Server, Info } from 'lucide-react';

interface NodeCardProps {
  node: NodeStatus;
  clusterName: string;
  provider: ProviderType;
  className?: string;
}

// Get provider-specific metadata to display
function getProviderMetadata(
  node: NodeStatus,
  provider: ProviderType
): Array<{ label: string; value: string }> {
  const metadata: Array<{ label: string; value: string }> = [];
  const data = node.providerData;

  if (!data) return metadata;

  switch (provider) {
    case 'proxmox':
      if (data.manufacturer && data.productName) {
        metadata.push({ label: 'Hardware', value: `${data.manufacturer} ${data.productName}` });
      }
      if (data.cpuModel) {
        metadata.push({ label: 'CPU', value: data.cpuModel });
      }
      if (data.cpuSockets && data.cpuCores) {
        metadata.push({ label: 'Cores', value: `${data.cpuSockets}s/${data.cpuCores}c` });
      }
      if (data.kernelVersion) {
        metadata.push({ label: 'Kernel', value: data.kernelVersion });
      }
      break;

    case 'kubernetes':
      if (data.kubeletVersion) {
        metadata.push({ label: 'Kubelet', value: data.kubeletVersion });
      }
      if (data.containerRuntime) {
        metadata.push({ label: 'Runtime', value: data.containerRuntime });
      }
      if (data.osImage) {
        metadata.push({ label: 'OS', value: data.osImage });
      }
      if (data.architecture) {
        metadata.push({ label: 'Arch', value: data.architecture });
      }
      if (data.taints && data.taints.length > 0) {
        metadata.push({ label: 'Taints', value: String(data.taints.length) });
      }
      break;

    case 'openstack':
      if (data.hypervisorType) {
        metadata.push({ label: 'Hypervisor', value: data.hypervisorType });
      }
      if (data.availabilityZone) {
        metadata.push({ label: 'AZ', value: data.availabilityZone });
      }
      if (data.hypervisorHostname) {
        metadata.push({ label: 'Hostname', value: data.hypervisorHostname });
      }
      break;
  }

  return metadata.slice(0, 4); // Limit to 4 items
}

export function NodeCard({ node, clusterName, provider, className }: NodeCardProps) {
  const providerMetadata = getProviderMetadata(node, provider);

  return (
    <Link
      href={`/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(node.name)}`}
      className="block"
    >
      <GradientCard className={cn('cursor-pointer', className)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Server className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{node.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{node.id}</p>
            </div>
          </div>
          <StatusBadge status={getStatusLabel(node.status)} />
        </div>

        {/* Uptime */}
        {node.uptime !== undefined && node.uptime > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            <span>Uptime: {formatUptime(node.uptime)}</span>
          </div>
        )}

        {/* Resource Bars */}
        <div className="space-y-3 mb-4">
          <ResourceBar
            label="CPU"
            percentage={node.cpu.percentage}
            displayMain={formatPercentage(node.cpu.percentage)}
            displaySub={`${node.cpu.total.toFixed(0)} cores`}
            colorClass={
              node.cpu.percentage > 80
                ? 'bg-red-500'
                : node.cpu.percentage > 60
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
            }
          />
          <ResourceBar
            label="Memory"
            percentage={node.memory.percentage}
            displayMain={formatBytes(node.memory.used)}
            displaySub={formatBytes(node.memory.total)}
            colorClass={
              node.memory.percentage > 80
                ? 'bg-red-500'
                : node.memory.percentage > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }
          />
          {node.storage && (
            <ResourceBar
              label="Storage"
              percentage={node.storage.percentage}
              displayMain={formatBytes(node.storage.used)}
              displaySub={formatBytes(node.storage.total)}
              colorClass={
                node.storage.percentage > 80
                  ? 'bg-red-500'
                  : node.storage.percentage > 60
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }
            />
          )}
        </div>

        {/* Provider-specific Metadata */}
        {providerMetadata.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                Details
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {providerMetadata.map(({ label, value }) => (
                <div key={label} className="flex flex-col overflow-hidden">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <span className="text-xs text-slate-300 truncate" title={value}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* K8s Conditions Warning */}
        {provider === 'kubernetes' && node.providerData?.conditions && (
          <K8sConditionsWarning conditions={node.providerData.conditions} />
        )}
      </GradientCard>
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
