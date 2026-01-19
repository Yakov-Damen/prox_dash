import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export default function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = uuidv4();
  requestHeaders.set('x-request-id', requestId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
