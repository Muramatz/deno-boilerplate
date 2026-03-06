import { z } from '@hono/zod-openapi';

export const CreateExampleRequestSchema = z
  .object({
    date: z.iso.date().openapi({ description: 'Date (YYYY-MM-DD)', example: '2024-01-15' }),
    field1: z.boolean().default(false).openapi({ description: 'Field 1' }),
    field2: z.string().openapi({ description: 'Field 2', example: 'Sample text' }),
  })
  .openapi('CreateExampleRequest');

export const UpdateExampleRequestSchema = z
  .object({
    field1: z.boolean().optional().openapi({ description: 'Field 1' }),
    field2: z.string().optional().openapi({ description: 'Field 2' }),
  })
  .openapi('UpdateExampleRequest');

export const ExampleResponseSchema = z
  .object({
    id: z.uuid().openapi({ description: 'ID' }),
    date: z.string().openapi({ description: 'Date' }),
    field1: z.boolean(),
    field2: z.string(),
    createdAt: z.string().openapi({ description: 'Created at' }),
    updatedAt: z.string().openapi({ description: 'Updated at' }),
  })
  .openapi('ExampleResponse');

export const ExampleListResponseSchema = z
  .array(ExampleResponseSchema)
  .openapi('ExampleListResponse');

export const ErrorResponseSchema = z
  .object({ error: z.object({ message: z.string() }) })
  .openapi('ErrorResponse');

export const IdParamSchema = z.object({
  id: z
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' }, description: 'ID' }),
});
