import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AppError } from '@/lib/errors.ts';
import {
  CreateExampleRequestSchema,
  ErrorResponseSchema,
  ExampleListResponseSchema,
  ExampleResponseSchema,
  IdParamSchema,
  UpdateExampleRequestSchema,
} from './openapi.ts';
import { ExampleService } from './service.ts';
import type { ExampleRecord } from './repository.ts';

function formatResponse(record: ExampleRecord) {
  return {
    id: record.id,
    date: record.date,
    field1: record.field1,
    field2: record.field2,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

const createExampleRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Example'],
  summary: 'Create a record',
  request: {
    body: {
      content: { 'application/json': { schema: CreateExampleRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: 'Created',
    },
    409: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Conflict',
    },
  },
});

const listExampleRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Example'],
  summary: 'List records',
  responses: {
    200: {
      content: { 'application/json': { schema: ExampleListResponseSchema } },
      description: 'OK',
    },
  },
});

const getExampleRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Example'],
  summary: 'Get a record',
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: 'OK',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not Found',
    },
  },
});

const updateExampleRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Example'],
  summary: 'Update a record',
  request: {
    params: IdParamSchema,
    body: {
      content: { 'application/json': { schema: UpdateExampleRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: 'Updated',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not Found',
    },
  },
});

const deleteExampleRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Example'],
  summary: 'Delete a record',
  request: { params: IdParamSchema },
  responses: {
    204: { description: 'Deleted' },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not Found',
    },
  },
});

const baseApp = new OpenAPIHono();

// Sub-app error handler
baseApp.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message } },
      err.statusCode as 400 | 404 | 409 | 500,
    );
  }
  throw err;
});

// Route registration with method chaining for RPC type inference
export const exampleRoutes = baseApp
  .openapi(listExampleRoute, async (c) => {
    const records = await ExampleService.list();
    return c.json(records.map(formatResponse), 200);
  })
  .openapi(createExampleRoute, async (c) => {
    const data = c.req.valid('json');
    const record = await ExampleService.create(data);
    return c.json(formatResponse(record), 201);
  })
  .openapi(getExampleRoute, async (c) => {
    const { id } = c.req.valid('param');
    const record = await ExampleService.getById(id);
    return c.json(formatResponse(record), 200);
  })
  .openapi(updateExampleRoute, async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const record = await ExampleService.update(id, data);
    return c.json(formatResponse(record), 200);
  })
  .openapi(deleteExampleRoute, async (c) => {
    const { id } = c.req.valid('param');
    await ExampleService.delete(id);
    return c.body(null, 204);
  });
