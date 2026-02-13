import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

const HealthResponseSchema = z
  .object({
    status: z.string().openapi({ example: 'ok' }),
    timestamp: z.string(),
    version: z.string(),
  })
  .openapi('HealthResponse');

const healthCheckRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Health'],
  summary: 'ヘルスチェック',
  responses: {
    200: {
      content: { 'application/json': { schema: HealthResponseSchema } },
      description: '正常',
    },
  },
});

export const healthRoutes = new OpenAPIHono().openapi(healthCheckRoute, (c) => {
  return c.json(
    { status: 'ok', timestamp: new Date().toISOString(), version: '0.0.0' },
    200,
  );
});
