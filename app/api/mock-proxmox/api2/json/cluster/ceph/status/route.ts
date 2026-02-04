import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: {
      health: {
        status: 'HEALTH_OK',
        checks: {},
        mils: {}
      },
      pgmap: {
        bytes_total: 10995116277760, // 10 TB
        bytes_used: 4831838208000,   // 4.4 TB
        bytes_avail: 6163278069760,  // 5.6 TB
        data_bytes: 1610612736000,
        data_bytes_raw: 4831838208000
      },
      fsmap: {
        up: 1,
        in: 1,
        max: 1
      },
      monmap: {
        mons: [
           { name: 'pve-01', rank: 0, addr: '192.168.1.11:6789' },
           { name: 'pve-02', rank: 1, addr: '192.168.1.12:6789' },
           { name: 'pve-03', rank: 2, addr: '192.168.1.13:6789' }
        ]
      }
    }
  });
}
