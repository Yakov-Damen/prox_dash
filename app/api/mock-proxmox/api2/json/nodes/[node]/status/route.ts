import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ node: string }> }) {
  const { node } = await params;
  
  // Randomize usage slightly
  const randomCpu = Math.random() * 0.2;
  
  let cpuModel = "Intel(R) Xeon(R) Gold 6130 CPU @ 2.10GHz";
  if (node.includes('offline')) {
     return NextResponse.json({ data: {} }, { status: 500 }); // Or just empty
  }
  if (node.includes('mock-2')) {
      cpuModel = "AMD EPYC 7763 64-Core Processor";
  }

  // Structure matches /api2/json/nodes/{node}/status
  const data = {
    data: {
      cpuinfo: {
        model: cpuModel,
        sockets: 2,
        cores: 32,
        cpus: 64
      },
      kversion: "Linux 6.8.4-2-pve #1 SMP PREEMPT_DYNAMIC PVE 6.8.4-2 (2024-04-10T17:36Z)",
      memory: {
        total: 135000000000,
        used: 45000000000,
      },
      rootfs: {
        total: 100000000000,
        used: 10000000000,
      },
      cpu: randomCpu,
      uptime: 1000000
    }
  };

  return NextResponse.json(data);
}
