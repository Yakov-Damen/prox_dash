import { NextRequest, NextResponse } from 'next/server';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getCluster, getProviderForCluster } from '@/lib/providers';

export const dynamic = 'force-dynamic';

type Params = Promise<{ name: string }>;

/**
 * GET /api/infrastructure/cluster/[name]
 *
 * Returns a single cluster status.
 * Auto-detects the provider from the cluster name.
 *
 * Response: ClusterStatus
 */
export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Params }
) => {
  const params = await props.params;
  const clusterName = decodeURIComponent(params.name);

  logger.info({ cluster: clusterName }, 'Fetching cluster status');

  // Check if we have a provider for this cluster
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ cluster: clusterName }, 'No provider found for cluster');
    return NextResponse.json(
      { error: 'Cluster not found' },
      { status: 404 }
    );
  }

  const cluster = await getCluster(clusterName);

  if (!cluster) {
    logger.warn({ cluster: clusterName }, 'Cluster not found');
    return NextResponse.json(
      { error: 'Cluster not found' },
      { status: 404 }
    );
  }

  logger.info(
    { cluster: clusterName, provider: cluster.provider, nodeCount: cluster.nodes.length },
    'Fetched cluster status'
  );

  return NextResponse.json(cluster);
});
