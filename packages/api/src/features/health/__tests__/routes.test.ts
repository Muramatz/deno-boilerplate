import { describe, expect, it } from '@/test/setup.ts';
import { OpenAPIHono } from '@hono/zod-openapi';
import { healthRoutes } from '../routes.ts';

const app = new OpenAPIHono().route('/api/health', healthRoutes);

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('200: health check succeeds', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBe('0.0.0');
    });
  });
});
