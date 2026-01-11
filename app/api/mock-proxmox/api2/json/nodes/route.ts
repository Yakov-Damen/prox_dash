import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Simulate some random data variations
  const randomCpu = Math.random() * 0.5 + 0.1; // 0.1 to 0.6
  const randomMem = Math.floor(Math.random() * 4 * 1024 * 1024 * 1024) + 4 * 1024 * 1024 * 1024; // 4GB to 8GB used
  const uptimeBase = 150000;
  
  const data = {
    data: [
      {
        id: "node/pve-mock-1",
        node: "pve-mock-1",
        status: "online",
        cpu: randomCpu,
        maxcpu: 16,
        mem: randomMem,
        maxmem: 32 * 1024 * 1024 * 1024, // 32GB
        disk: 250 * 1024 * 1024 * 1024,
        maxdisk: 1000 * 1024 * 1024 * 1024, // 1TB
        uptime: uptimeBase + Math.floor(Math.random() * 1000)
      },
      {
        id: "node/pve-mock-2",
        node: "pve-mock-2",
        status: "online",
        cpu: Math.random() * 0.3,
        maxcpu: 8,
        mem: 12 * 1024 * 1024 * 1024,
        maxmem: 16 * 1024 * 1024 * 1024,
        disk: 50 * 1024 * 1024 * 1024,
        maxdisk: 500 * 1024 * 1024 * 1024,
        uptime: 80000
      },
      {
        id: "node/pve-mock-offline",
        node: "pve-mock-offline",
        status: "offline",
        cpu: 0,
        maxcpu: 4,
        mem: 0,
        maxmem: 8 * 1024 * 1024 * 1024,
        uptime: 0
      }
    ]
  };

  return NextResponse.json(data);
}
