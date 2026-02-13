import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import type { MiddlewareHandler } from 'hono';

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ['app'],
      sinks: ['console'],
      lowestLevel: 'info',
    },
  ],
});

export const logger = getLogger(['app']);

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req.raw;
  await next();
  const duration = Date.now() - start;
  logger.info`${method} ${url} ${c.res.status} ${duration}ms`;
};
