import { NextRequest, NextResponse } from 'next/server';
import { NodeStatus as LegacyNodeStatus } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getNode, getProviderForCluster } from '@/lib/providers';
import { NodeStatus as UnifiedNodeStatus } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

// Dynamic params type for Next.js 15+ (or 13+ app dir)
type Params = Promise<{ name: string; node: string }>;

/**
 * Convert unified node status back to legacy format for backward compatibility.
 */
function convertToLegacyFormat(unified: UnifiedNodeStatus): LegacyNodeStatus {
  return {
    id: unified.id,
    node: unified.name,
    status: unified.status as 'online' | 'offline' | 'unknown',
    cpu: unified.cpu.total > 0 ? unified.cpu.used / unified.cpu.total : 0,
    maxcpu: unified.cpu.total,
    mem: unified.memory.used,
    maxmem: unified.memory.total,
    uptime: unified.uptime || 0,
    disk: unified.storage?.used,
    maxdisk: unified.storage?.total,
    cpuModel: unified.providerData?.cpuModel,
    cpuSockets: unified.providerData?.cpuSockets,
    cpuCores: unified.providerData?.cpuCores,
    kernelVersion: unified.providerData?.kernelVersion,
    manufacturer: unified.providerData?.manufacturer,
    productName: unified.providerData?.productName,
  };
}

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Params }
) => {
  const { name, node } = await props.params;
  const clusterName = decodeURIComponent(name);
  const nodeName = decodeURIComponent(node);

  logger.info({ cluster: clusterName, node: nodeName }, 'Fetching node status (legacy Proxmox endpoint)');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider || provider.type !== 'proxmox') {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  // Use the new provider system internally
  const unifiedStatus = await getNode(clusterName, nodeName);

  if (!unifiedStatus) {
    return NextResponse.json({ error: 'Node not found or offline' }, { status: 404 });
  }

  // Convert to legacy format for backward compatibility
  const legacyStatus = convertToLegacyFormat(unifiedStatus);
  return NextResponse.json(legacyStatus);
});
