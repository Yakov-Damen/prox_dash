import { NextRequest, NextResponse } from 'next/server';
import { getClusterConfigs, fetchClusterStatus } from '@/lib/proxmox';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const name = (await params).name;
  const configs = getClusterConfigs();
  const config = configs.find(c => c.name === decodeURIComponent(name));

  if (!config) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const status = await fetchClusterStatus(config);
  return NextResponse.json(status);
}
