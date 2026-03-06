import type { ErrorHandler } from 'hono';
import { AppError } from '@/lib/errors.ts';
import { logger } from './logger.ts';

export const errorHandler: ErrorHandler = (err, c) => {
  logger.error`${err.message} ${err.stack} ${c.req.url} ${c.req.method}`;

  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message } },
      err.statusCode as 400 | 404 | 409 | 500,
    );
  }

  const isDevelopment = Deno.env.get('DENO_ENV') !== 'production';
  return c.json(
    { error: { message: isDevelopment ? err.message : 'Internal Server Error' } },
    500,
  );
};
