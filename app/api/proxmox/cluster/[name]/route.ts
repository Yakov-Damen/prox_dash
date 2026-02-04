import { NextRequest, NextResponse } from 'next/server';
import { ClusterStatus as LegacyClusterStatus } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getCluster, getProviderForCluster } from '@/lib/providers';
import { ClusterStatus as UnifiedClusterStatus, NodeStatus as UnifiedNodeStatus } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * Convert unified cluster status back to legacy format for backward compatibility.
 */
function convertToLegacyFormat(unified: UnifiedClusterStatus): LegacyClusterStatus {
  return {
    name: unified.name,
    version: unified.version,
    error: unified.error,
    nodes: unified.nodes.map((node: UnifiedNodeStatus) => ({
      id: node.id,
      node: node.name,
      status: node.status as 'online' | 'offline' | 'unknown',
      cpu: node.cpu.total > 0 ? node.cpu.used / node.cpu.total : 0,
      maxcpu: node.cpu.total,
      mem: node.memory.used,
      maxmem: node.memory.total,
      uptime: node.uptime || 0,
      disk: node.storage?.used,
      maxdisk: node.storage?.total,
      cpuModel: node.providerData?.cpuModel,
      cpuSockets: node.providerData?.cpuSockets,
      cpuCores: node.providerData?.cpuCores,
      kernelVersion: node.providerData?.kernelVersion,
      manufacturer: node.providerData?.manufacturer,
      productName: node.providerData?.productName,
    })),
  };
}

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Promise<{ name: string }> }
) => {
  const params = await props.params;
  const clusterName = decodeURIComponent(params.name);

  logger.info({ cluster: clusterName }, 'Fetching cluster status (legacy Proxmox endpoint)');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider || provider.type !== 'proxmox') {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  // Use the new provider system internally
  const unifiedStatus = await getCluster(clusterName);

  if (!unifiedStatus) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  // Convert to legacy format for backward compatibility
  const legacyStatus = convertToLegacyFormat(unifiedStatus);
  return NextResponse.json(legacyStatus);
});
