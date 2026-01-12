import { NextRequest, NextResponse } from 'next/server';
import { getClusterConfigs, getNodeVMs } from '@/lib/proxmox';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; node: string }> }
) {
  const { name, node } = await params;
  const configs = getClusterConfigs();
  const config = configs.find(c => c.name === decodeURIComponent(name));

  if (!config) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const vms = await getNodeVMs(config, node);
  return NextResponse.json(vms);
}
