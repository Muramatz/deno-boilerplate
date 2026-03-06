import { prisma } from '@/db/index.ts';
import type { Example } from '../../../generated/prisma/client.ts';

/** Convert Prisma Date output to app-layer string (YYYY-MM-DD). */
export type ExampleRecord = Omit<Example, 'date'> & { date: string };
export type NewExampleRecord = {
  date: string;
  field1?: boolean;
  field2: string;
};

/** YYYY-MM-DD string -> Date (UTC midnight). */
function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

function toRecord(row: Example): ExampleRecord {
  return { ...row, date: row.date.toISOString().slice(0, 10) };
}

export const ExampleRepository = {
  async list(): Promise<ExampleRecord[]> {
    const rows = await prisma.example.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRecord);
  },

  async create(data: NewExampleRecord): Promise<ExampleRecord> {
    const record = await prisma.example.create({
      data: { ...data, date: toDate(data.date) },
    });
    return toRecord(record);
  },

  async findById(id: string): Promise<ExampleRecord | null> {
    const record = await prisma.example.findUnique({ where: { id } });
    return record ? toRecord(record) : null;
  },

  async findByDate(date: string): Promise<ExampleRecord | null> {
    const record = await prisma.example.findUnique({
      where: { date: toDate(date) },
    });
    return record ? toRecord(record) : null;
  },

  async update(
    id: string,
    data: Partial<NewExampleRecord>,
  ): Promise<ExampleRecord | null> {
    try {
      const record = await prisma.example.update({ where: { id }, data });
      return toRecord(record);
    } catch (e: unknown) {
      if (
        typeof e === 'object' && e !== null && 'code' in e &&
        (e as { code: string }).code === 'P2025'
      ) {
        return null;
      }
      throw e;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.example.delete({ where: { id } });
      return true;
    } catch (e: unknown) {
      if (
        typeof e === 'object' && e !== null && 'code' in e &&
        (e as { code: string }).code === 'P2025'
      ) {
        return false;
      }
      throw e;
    }
  },
};
