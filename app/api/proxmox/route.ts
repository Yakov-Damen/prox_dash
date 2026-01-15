import { NextResponse } from 'next/server';
import { getAllClustersStatus } from '@/lib/proxmox';

import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Ensure this isn't cached at build time

export async function GET() {
  logger.info("Fetching all clusters status");
  const data = await getAllClustersStatus();
  logger.info({ clusterCount: data.length }, "Typically fetched clusters");
  return NextResponse.json(data);
}
