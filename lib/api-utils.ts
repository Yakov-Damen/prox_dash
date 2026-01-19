import { NextRequest, NextResponse } from 'next/server';
import { requestContext, logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export function withLogger<T>(handler: (req: NextRequest, context: T) => Promise<NextResponse | Response>) {
  return async (req: NextRequest, context: T) => {
    const requestId = req.headers.get('x-request-id') || uuidv4();
    
    return requestContext.run({ requestId }, async () => {
      const start = Date.now();
      const method = req.method;
      // req.nextUrl is available on NextRequest
      const url = req.nextUrl.pathname;
      
      logger.info({ method, url }, 'Incoming request');
      
      try {
        const response = await handler(req, context);
        const duration = Date.now() - start;
        logger.info({ method, url, status: response.status, duration }, 'Request completed');
        return response;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const duration = Date.now() - start;
        logger.error({ method, url, err, duration }, 'Request failed');
        return NextResponse.json(
             { error: 'Internal Server Error', requestId }, 
             { status: 500 }
        );
      }
    });
  };
}
