import { NextResponse } from 'next/server';
import { getAllClustersStatus } from '@/lib/proxmox';

export const dynamic = 'force-dynamic'; // Ensure this isn't cached at build time

export async function GET() {
  const data = await getAllClustersStatus();
  return NextResponse.json(data);
}
