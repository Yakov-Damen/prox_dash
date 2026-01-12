import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = {
    data: [
      {
        vmid: 200,
        name: "web-container",
        status: "running",
        cpus: 1,
        maxmem: 1073741824,
        mem: 536870912,
        uptime: 7200
      }
    ]
  };
  return NextResponse.json(data);
}
