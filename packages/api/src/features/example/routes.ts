import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AppError } from '@/lib/errors.ts';
import {
  CreateExampleRequestSchema,
  ErrorResponseSchema,
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
  summary: 'データを作成',
  request: {
    body: {
      content: { 'application/json': { schema: CreateExampleRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: '作成成功',
    },
    409: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: '重複エラー',
    },
  },
});

const getExampleRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Example'],
  summary: 'データを取得',
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: '取得成功',
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
  summary: 'データを更新',
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
      description: '更新成功',
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
  summary: 'データを削除',
  request: { params: IdParamSchema },
  responses: {
    204: { description: '削除成功' },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not Found',
    },
  },
});

const baseApp = new OpenAPIHono();

// サブアプリ用エラーハンドラ
baseApp.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message } },
      err.statusCode as 400 | 404 | 409 | 500,
    );
  }
  throw err;
});

// ルート登録（メソッドチェーン必須 → RPC型推論のため）
export const exampleRoutes = baseApp
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
