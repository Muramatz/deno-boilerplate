import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { OpenAPIHono } from '@hono/zod-openapi';
import { exampleRoutes } from '../routes.ts';

describe('Example Routes (integration)', () => {
  useTestDb();

  const app = new OpenAPIHono().route('/api/example', exampleRoutes);

  // --- Helpers ---

  function post(body: Record<string, unknown>) {
    return app.request('/api/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function get(id: string) {
    return app.request(`/api/example/${id}`);
  }

  function list() {
    return app.request('/api/example');
  }

  function patch(id: string, body: Record<string, unknown>) {
    return app.request(`/api/example/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function del(id: string) {
    return app.request(`/api/example/${id}`, { method: 'DELETE' });
  }

  // --- POST ---

  describe('POST /api/example', () => {
    it('201: creates data', async () => {
      const res = await post({
        date: '2025-01-15',
        field1: true,
        field2: 'integration test',
      });

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.date).toBe('2025-01-15');
      expect(body.field1).toBe(true);
      expect(body.field2).toBe('integration test');
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('201: field1 defaults to false', async () => {
      const res = await post({ date: '2025-02-01', field2: 'default test' });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.field1).toBe(false);
    });

    it('409: duplicate date conflict', async () => {
      await post({ date: '2025-03-01', field2: 'first' });

      const res = await post({ date: '2025-03-01', field2: 'duplicate' });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.message).toBeDefined();
    });

    it('400: validation error when field2 is missing', async () => {
      const res = await post({ date: '2025-04-01' });

      expect(res.status).toBe(400);
    });

    it('400: invalid date format', async () => {
      const res = await post({ date: 'not-a-date', field2: 'bad date' });

      expect(res.status).toBe(400);
    });
  });

  // --- GET ---

  describe('GET /api/example', () => {
    it('200: returns list of records', async () => {
      await post({ date: '2025-04-10', field2: 'list a' });
      await post({ date: '2025-04-11', field2: 'list b' });

      const res = await list();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body[0].id).toBeDefined();
    });
  });

  describe('GET /api/example/:id', () => {
    it('200: gets data by id', async () => {
      const createRes = await post({ date: '2025-05-01', field2: 'get test' });
      const created = await createRes.json();

      const res = await get(created.id);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(created.id);
      expect(body.date).toBe('2025-05-01');
      expect(body.field2).toBe('get test');
    });

    it('404: unknown id', async () => {
      const res = await get('00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toBeDefined();
    });

    it('400: invalid UUID format', async () => {
      const res = await get('not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  // --- PATCH ---

  describe('PATCH /api/example/:id', () => {
    it('200: updates data', async () => {
      const createRes = await post({
        date: '2025-06-01',
        field1: false,
        field2: 'original',
      });
      const created = await createRes.json();

      const res = await patch(created.id, {
        field1: true,
        field2: 'modified',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.field1).toBe(true);
      expect(body.field2).toBe('modified');
      expect(body.date).toBe('2025-06-01');
    });

    it('200: updates partial fields', async () => {
      const createRes = await post({
        date: '2025-07-01',
        field1: true,
        field2: 'keep me',
      });
      const created = await createRes.json();

      const res = await patch(created.id, { field2: 'updated only field2' });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.field1).toBe(true);
      expect(body.field2).toBe('updated only field2');
    });

    it('404: unknown id', async () => {
      const res = await patch('00000000-0000-0000-0000-000000000000', {
        field2: 'noop',
      });

      expect(res.status).toBe(404);
    });
  });

  // --- DELETE ---

  describe('DELETE /api/example/:id', () => {
    it('204: deletes data', async () => {
      const createRes = await post({ date: '2025-08-01', field2: 'delete me' });
      const created = await createRes.json();

      const deleteRes = await del(created.id);
      expect(deleteRes.status).toBe(204);

      // GET should return 404 after deletion.
      const getRes = await get(created.id);
      expect(getRes.status).toBe(404);
    });

    it('404: unknown id', async () => {
      const res = await del('00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
    });
  });
});
