import { NextResponse } from 'next/server';
import { ClusterStatus as LegacyClusterStatus } from '@/lib/proxmox';
import { logger } from '@/lib/logger';
import { withLogger } from '@/lib/api-utils';
import { getAllClusters } from '@/lib/providers';
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

export const GET = withLogger(async () => {
  logger.info("Fetching all clusters status (legacy Proxmox endpoint)");

  // Use the new provider system internally
  const unifiedData = await getAllClusters('proxmox');

  // Convert to legacy format for backward compatibility
  const legacyData = unifiedData.map(convertToLegacyFormat);

  logger.info({ clusterCount: legacyData.length }, "Fetched clusters (legacy format)");
  return NextResponse.json(legacyData);
});
