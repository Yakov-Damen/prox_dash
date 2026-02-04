'use client';

import { cn } from '@/lib/utils';
import { formatBytes, formatUptime, formatPercentage, getStatusLabel } from '@/lib/status-utils';
import { StatusBadge } from '@/components/StatusBadge';
import type { Workload, ProviderType, WorkloadType } from '@/lib/providers/types';
import {
  Monitor,
  Container,
  Box,
  Layers,
  Server,
  Clock,
  Repeat,
  HardDrive,
} from 'lucide-react';

interface WorkloadTableProps {
  workloads: Workload[];
  provider: ProviderType;
  className?: string;
}

// Icons for different workload types
const workloadTypeIcons: Record<WorkloadType, typeof Monitor> = {
  // Proxmox
  qemu: Monitor,
  lxc: Container,
  // Kubernetes
  pod: Box,
  deployment: Layers,
  statefulset: Server,
  daemonset: Server,
  job: Clock,
  cronjob: Repeat,
  // OpenStack
  instance: Monitor,
  volume: HardDrive,
};

// Labels for workload types
const workloadTypeLabels: Record<WorkloadType, string> = {
  qemu: 'VM',
  lxc: 'Container',
  pod: 'Pod',
  deployment: 'Deployment',
  statefulset: 'StatefulSet',
  daemonset: 'DaemonSet',
  job: 'Job',
  cronjob: 'CronJob',
  instance: 'Instance',
  volume: 'Volume',
};

function WorkloadTypeIcon({ type }: { type: WorkloadType }) {
  const Icon = workloadTypeIcons[type] || Box;
  return <Icon className="h-4 w-4 text-slate-400" />;
}

export function WorkloadTable({ workloads, provider, className }: WorkloadTableProps) {
  if (workloads.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        No workloads found
      </div>
    );
  }

  // Determine which columns to show based on provider
  const showNamespace = provider === 'kubernetes';
  const showVmid = provider === 'proxmox';
  const showFlavor = provider === 'openstack';

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-slate-400">
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">ID</th>
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Type</th>
            {showNamespace && <th className="pb-3 pr-4 font-medium">Namespace</th>}
            {showFlavor && <th className="pb-3 pr-4 font-medium">Flavor</th>}
            <th className="pb-3 pr-4 font-medium text-right">CPU</th>
            <th className="pb-3 pr-4 font-medium text-right">Memory</th>
            <th className="pb-3 font-medium text-right">Uptime</th>
          </tr>
        </thead>
        <tbody>
          {workloads.map((workload) => (
            <WorkloadRow
              key={workload.id}
              workload={workload}
              showNamespace={showNamespace}
              showVmid={showVmid}
              showFlavor={showFlavor}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface WorkloadRowProps {
  workload: Workload;
  showNamespace: boolean;
  showVmid: boolean;
  showFlavor: boolean;
}

function WorkloadRow({ workload, showNamespace, showVmid, showFlavor }: WorkloadRowProps) {
  // Format ID display
  const displayId = showVmid && workload.providerData?.vmid
    ? String(workload.providerData.vmid)
    : workload.id.length > 12
      ? `${workload.id.slice(0, 8)}...`
      : workload.id;

  // CPU display
  const cpuDisplay = workload.cpu.usage !== undefined
    ? `${formatPercentage(workload.cpu.usage * 100, 0)} / ${workload.cpu.count}`
    : `${workload.cpu.count} cores`;

  // Memory display
  const memoryDisplay = workload.memory.total > 0
    ? `${formatBytes(workload.memory.used)} / ${formatBytes(workload.memory.total)}`
    : formatBytes(workload.memory.used);

  // Uptime display
  const uptimeDisplay = workload.uptime
    ? formatUptime(workload.uptime)
    : '-';

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
      <td className="py-3 pr-4">
        <StatusBadge status={getStatusLabel(workload.status)} />
      </td>
      <td className="py-3 pr-4">
        <span className="font-mono text-xs text-slate-400" title={workload.id}>
          {displayId}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span className="text-slate-200 font-medium">{workload.name}</span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <WorkloadTypeIcon type={workload.type} />
          <span className="text-slate-400">{workloadTypeLabels[workload.type]}</span>
        </div>
      </td>
      {showNamespace && (
        <td className="py-3 pr-4">
          <span className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded">
            {workload.providerData?.namespace || 'default'}
          </span>
        </td>
      )}
      {showFlavor && (
        <td className="py-3 pr-4">
          <span className="text-slate-400">
            {workload.providerData?.flavorName || '-'}
          </span>
        </td>
      )}
      <td className="py-3 pr-4 text-right">
        <span className="text-slate-300 font-mono text-xs">{cpuDisplay}</span>
      </td>
      <td className="py-3 pr-4 text-right">
        <span className="text-slate-300 font-mono text-xs">{memoryDisplay}</span>
      </td>
      <td className="py-3 text-right">
        <span className="text-slate-400 text-xs">{uptimeDisplay}</span>
      </td>
    </tr>
  );
}
