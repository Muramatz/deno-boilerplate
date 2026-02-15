import { z } from '@hono/zod-openapi';

export const CreateExampleRequestSchema = z
  .object({
    date: z.iso.date().openapi({ description: '日付 (YYYY-MM-DD)', example: '2024-01-15' }),
    field1: z.boolean().default(false).openapi({ description: 'フィールド1' }),
    field2: z.string().openapi({ description: 'フィールド2', example: 'サンプルテキスト' }),
  })
  .openapi('CreateExampleRequest');

export const UpdateExampleRequestSchema = z
  .object({
    field1: z.boolean().optional().openapi({ description: 'フィールド1' }),
    field2: z.string().optional().openapi({ description: 'フィールド2' }),
  })
  .openapi('UpdateExampleRequest');

export const ExampleResponseSchema = z
  .object({
    id: z.uuid().openapi({ description: 'ID' }),
    date: z.string().openapi({ description: '日付' }),
    field1: z.boolean(),
    field2: z.string(),
    createdAt: z.string().openapi({ description: '作成日時' }),
    updatedAt: z.string().openapi({ description: '更新日時' }),
  })
  .openapi('ExampleResponse');

export const ErrorResponseSchema = z
  .object({ error: z.object({ message: z.string() }) })
  .openapi('ErrorResponse');

export const IdParamSchema = z.object({
  id: z
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' }, description: 'ID' }),
});
