import { NextRequest, NextResponse } from 'next/server';
import { getClusterConfigs, getNodeStatus } from '@/lib/proxmox';
import { withLogger } from '@/lib/api-utils';

// Dynamic params type for Next.js 15+ (or 13+ app dir)
type Params = Promise<{ name: string; node: string }>;

export const GET = withLogger(async (
  request: NextRequest,
  props: { params: Params }
) => {
  const { name, node } = await props.params;
  const clusterName = decodeURIComponent(name);
  const nodeName = decodeURIComponent(node);
  
  const config = getClusterConfigs().find(c => c.name === clusterName);
  
  if (!config) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const status = await getNodeStatus(config, nodeName);
  
  if (!status) {
    return NextResponse.json({ error: 'Node not found or offline' }, { status: 404 });
  }

  return NextResponse.json(status);
});
