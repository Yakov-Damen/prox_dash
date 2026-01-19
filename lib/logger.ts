import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  mixin() {
    const store = requestContext.getStore();
    if (store) {
       return { reqId: store.requestId };
    }
    return {};
  }
});
