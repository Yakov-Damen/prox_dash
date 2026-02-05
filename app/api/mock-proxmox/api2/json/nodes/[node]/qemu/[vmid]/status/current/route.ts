import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ node: string, vmid: string }> }) {
  const { vmid } = await params;
  
  // Return random CPU usage for verification
  const randomCpu = Math.random() * 0.5; // 0-50%

  return NextResponse.json({
    data: {
      name: `vm-${vmid}`,
      status: "running",
      cpu: randomCpu,
      cpus: 4,
      mem: 2048 * 1024 * 1024, // 2GB
      maxmem: 4096 * 1024 * 1024, // 4GB
      uptime: 3600,
      vmid: parseInt(vmid),
    }
  });
}
