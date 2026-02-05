import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ node: string, vmid: string }> }) {
  const { vmid } = await params;
  
  // Return random CPU usage for verification
  const randomCpu = Math.random() * 0.3; // 0-30%

  return NextResponse.json({
    data: {
      name: `ct-${vmid}`,
      status: "running",
      cpu: randomCpu,
      cpus: 2,
      mem: 512 * 1024 * 1024, // 512MB
      maxmem: 1024 * 1024 * 1024, // 1GB
      uptime: 7200,
      vmid: parseInt(vmid),
      type: 'lxc'
    }
  });
}
