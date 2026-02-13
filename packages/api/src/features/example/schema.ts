import { z } from 'zod';

// ベーススキーマ
export const baseExampleSchema = z.object({
  field1: z.boolean().default(false),
  field2: z.string(),
});

// 作成スキーマ（ベース + 追加フィールド）
export const createExampleSchema = baseExampleSchema.extend({
  date: z.iso.date(),
});
export type CreateExample = z.infer<typeof createExampleSchema>;

// 更新スキーマ（部分更新）
export const updateExampleSchema = baseExampleSchema.partial();
export type UpdateExample = z.infer<typeof updateExampleSchema>;

// レスポンススキーマ（メタデータ付き）
export const exampleSchema = baseExampleSchema.extend({
  id: z.uuid(),
  date: z.iso.date(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Example = z.infer<typeof exampleSchema>;
