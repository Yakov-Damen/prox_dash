import { NextRequest, NextResponse } from 'next/server';
import { VMStatus as LegacyVMStatus } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getWorkloads, getProviderForCluster } from '@/lib/providers';
import { Workload } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * Convert unified workload back to legacy VM format for backward compatibility.
 */
function convertToLegacyFormat(workload: Workload): LegacyVMStatus {
  return {
    vmid: workload.providerData?.vmid || parseInt(workload.id, 10) || 0,
    name: workload.name,
    status: workload.status as 'running' | 'stopped' | 'paused',
    cpus: workload.cpu.count,
    cpuUsage: workload.cpu.usage,
    maxmem: workload.memory.total,
    mem: workload.memory.used,
    uptime: workload.uptime || 0,
    type: workload.type as 'qemu' | 'lxc',
  };
}

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Promise<{ name: string; node: string }> }
) => {
  const { name, node } = await props.params;
  const clusterName = decodeURIComponent(name);
  const nodeName = decodeURIComponent(node);

  logger.info({ cluster: clusterName, node: nodeName }, 'Fetching VMs (legacy Proxmox endpoint)');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider || provider.type !== 'proxmox') {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  // Use the new provider system internally
  const workloads = await getWorkloads(clusterName, nodeName);

  // Filter to only Proxmox workload types and convert to legacy format
  const legacyVMs = workloads
    .filter(w => w.type === 'qemu' || w.type === 'lxc')
    .map(convertToLegacyFormat);

  logger.info({ cluster: clusterName, node: nodeName, vmCount: legacyVMs.length }, 'Fetched VMs (legacy format)');
  return NextResponse.json(legacyVMs);
});
