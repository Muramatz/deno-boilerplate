import { eq } from 'drizzle-orm';
import { db } from '@/db/index.ts';
import { type ExampleRecord, examples, type NewExampleRecord } from './table.ts';

export const ExampleRepository = {
  async create(data: NewExampleRecord): Promise<ExampleRecord> {
    const [record] = await db.insert(examples).values(data).returning();
    if (!record) throw new Error('Failed to create record');
    return record;
  },

  async findById(id: string): Promise<ExampleRecord | null> {
    const [record] = await db.select().from(examples).where(eq(examples.id, id));
    return record ?? null;
  },

  async findByDate(date: string): Promise<ExampleRecord | null> {
    const [record] = await db
      .select()
      .from(examples)
      .where(eq(examples.date, date));
    return record ?? null;
  },

  async update(
    id: string,
    data: Partial<NewExampleRecord>,
  ): Promise<ExampleRecord | null> {
    const [record] = await db
      .update(examples)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(examples.id, id))
      .returning();
    return record ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(examples)
      .where(eq(examples.id, id))
      .returning({ id: examples.id });
    return result.length > 0;
  },
};
