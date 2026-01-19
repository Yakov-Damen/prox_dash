import { NextResponse } from 'next/server';
import { getAllClustersStatus } from '@/lib/proxmox';
import { logger } from '@/lib/logger';
import { withLogger } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = withLogger(async () => {
  logger.info("Fetching all clusters status");
  const data = await getAllClustersStatus();
  logger.info({ clusterCount: data.length }, "Fetched clusters");
  return NextResponse.json(data);
});
