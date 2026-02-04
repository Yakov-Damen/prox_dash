import { NextRequest, NextResponse } from 'next/server';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getNode, getProviderForCluster } from '@/lib/providers';

export const dynamic = 'force-dynamic';

type Params = Promise<{ name: string; node: string }>;

/**
 * GET /api/infrastructure/cluster/[name]/node/[node]
 *
 * Returns a single node status.
 * Auto-detects the provider from the cluster name.
 *
 * Response: NodeStatus
 */
export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Params }
) => {
  const params = await props.params;
  const clusterName = decodeURIComponent(params.name);
  const nodeName = decodeURIComponent(params.node);

  logger.info({ cluster: clusterName, node: nodeName }, 'Fetching node status');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ cluster: clusterName }, 'No provider found for cluster');
    return NextResponse.json(
      { error: 'Cluster not found' },
      { status: 404 }
    );
  }

  const node = await getNode(clusterName, nodeName);

  if (!node) {
    logger.warn({ cluster: clusterName, node: nodeName }, 'Node not found or offline');
    return NextResponse.json(
      { error: 'Node not found or offline' },
      { status: 404 }
    );
  }

  logger.info(
    { cluster: clusterName, node: nodeName, status: node.status },
    'Fetched node status'
  );

  return NextResponse.json(node);
});
