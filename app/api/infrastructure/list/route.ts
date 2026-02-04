import { NextRequest, NextResponse } from 'next/server';
import { withLogger } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getAllProviders } from '@/lib/providers';
import { ProviderType, ProviderTypes } from '@/lib/providers/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/infrastructure/list
 * Returns list of all cluster names from all configured providers
 * Supports optional ?provider=proxmox|kubernetes|openstack filter
 */
export const GET = withLogger(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const providerFilter = searchParams.get('provider') as ProviderType | null;

  // Validate provider filter if provided
  if (providerFilter && !ProviderTypes.includes(providerFilter)) {
    return NextResponse.json(
      { error: `Invalid provider type: ${providerFilter}` },
      { status: 400 }
    );
  }

  logger.info({ provider: providerFilter || 'all' }, 'Fetching cluster names');

  const providers = getAllProviders();

  // Filter by provider type if specified
  const filteredProviders = providerFilter
    ? providers.filter((p) => p.type === providerFilter)
    : providers;

  // Get names from each provider
  const names: string[] = filteredProviders.map((p) => p.name);

  logger.info({ count: names.length }, 'Fetched cluster names');

  return NextResponse.json(names);
});
