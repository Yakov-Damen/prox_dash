import { NextResponse } from 'next/server';
import { getClusterNames } from '@/lib/proxmox';
import { logger } from '@/lib/logger';
import { withLogger } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = withLogger(async () => {
  logger.info("Fetching cluster list");
  const names = getClusterNames();
  logger.info({ count: names.length }, "Fetched cluster list");
  return NextResponse.json(names);
});
