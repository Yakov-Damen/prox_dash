import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = {
    data: [
      {
        vmid: 100,
        name: "test-vm-1",
        status: "running",
        cpus: 2,
        maxmem: 4294967296,
        mem: 1073741824,
        uptime: 3600
      },
      {
        vmid: 101,
        name: "db-server",
        status: "stopped",
        cpus: 4,
        maxmem: 8589934592,
        mem: 0,
        uptime: 0
      }
    ]
  };
  return NextResponse.json(data);
}
