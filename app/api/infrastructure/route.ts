import { NextRequest, NextResponse } from 'next/server';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getAllClusters, ProviderTypes } from '@/lib/providers';
import { ProviderType } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/infrastructure
 *
 * Returns all clusters from all providers.
 *
 * Query Parameters:
 * - provider: Filter by provider type (proxmox|kubernetes|openstack)
 *
 * Response: ClusterStatus[]
 */
export const GET = withLogger(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const providerParam = searchParams.get('provider');

  // Validate provider parameter if provided
  let providerType: ProviderType | undefined;
  if (providerParam) {
    if (!ProviderTypes.includes(providerParam as ProviderType)) {
      return NextResponse.json(
        { error: `Invalid provider type. Must be one of: ${ProviderTypes.join(', ')}` },
        { status: 400 }
      );
    }
    providerType = providerParam as ProviderType;
  }

  logger.info({ provider: providerType || 'all' }, 'Fetching all clusters from infrastructure providers');

  const clusters = await getAllClusters(providerType);

  logger.info(
    { clusterCount: clusters.length, provider: providerType || 'all' },
    'Fetched clusters from infrastructure providers'
  );

  return NextResponse.json(clusters);
});
