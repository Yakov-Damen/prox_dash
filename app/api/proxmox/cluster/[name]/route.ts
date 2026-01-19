import { NextRequest, NextResponse } from 'next/server';
import { getClusterConfigs, fetchClusterStatus } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Promise<{ name: string }> }
) => {
  const params = await props.params;
  const name = params.name;
  const configs = getClusterConfigs();
  const config = configs.find(c => c.name === decodeURIComponent(name));

  if (!config) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const status = await fetchClusterStatus(config);
  return NextResponse.json(status);
});
