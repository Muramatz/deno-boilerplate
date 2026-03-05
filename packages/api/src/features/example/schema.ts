import { z } from 'zod';

// Base schema
export const baseExampleSchema = z.object({
  field1: z.boolean().default(false),
  field2: z.string().min(1),
});

// Create schema (base + additional fields)
export const createExampleSchema = baseExampleSchema.extend({
  date: z.iso.date(),
});
export type CreateExample = z.infer<typeof createExampleSchema>;

// Update schema (partial update)
export const updateExampleSchema = baseExampleSchema.partial();
export type UpdateExample = z.infer<typeof updateExampleSchema>;

// Response schema (with metadata)
export const exampleSchema = baseExampleSchema.extend({
  id: z.uuid(),
  date: z.iso.date(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Example = z.infer<typeof exampleSchema>;
