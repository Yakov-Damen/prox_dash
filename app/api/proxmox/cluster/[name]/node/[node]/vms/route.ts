import { NextRequest, NextResponse } from 'next/server';
import { getClusterConfigs, getNodeVMs } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Promise<{ name: string; node: string }> }
) => {
  const { name, node } = await props.params;
  const configs = getClusterConfigs();
  const config = configs.find(c => c.name === decodeURIComponent(name));

  if (!config) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const vms = await getNodeVMs(config, node);
  return NextResponse.json(vms);
});
