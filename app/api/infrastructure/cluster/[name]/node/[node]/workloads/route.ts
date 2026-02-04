import { NextRequest, NextResponse } from 'next/server';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getWorkloads, getProviderForCluster } from '@/lib/providers';

export const dynamic = 'force-dynamic';

type Params = Promise<{ name: string; node: string }>;

/**
 * GET /api/infrastructure/cluster/[name]/node/[node]/workloads
 *
 * Returns all workloads (VMs, pods, instances) on a node.
 * Auto-detects the provider from the cluster name.
 *
 * Response: Workload[]
 */
export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Params }
) => {
  const params = await props.params;
  const clusterName = decodeURIComponent(params.name);
  const nodeName = decodeURIComponent(params.node);

  logger.info({ cluster: clusterName, node: nodeName }, 'Fetching workloads');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ cluster: clusterName }, 'No provider found for cluster');
    return NextResponse.json(
      { error: 'Cluster not found' },
      { status: 404 }
    );
  }

  const workloads = await getWorkloads(clusterName, nodeName);

  logger.info(
    { cluster: clusterName, node: nodeName, workloadCount: workloads.length },
    'Fetched workloads'
  );

  return NextResponse.json(workloads);
});
