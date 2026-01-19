import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: {
      version: '8.1.4',
      release: '8.1',
      repoid: 'mock-repo',
      keyboard: 'en'
    }
  });
}
