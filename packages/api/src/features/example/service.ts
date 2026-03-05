import type { CreateExample, UpdateExample } from './schema.ts';
import { ConflictError, NotFoundError } from '@/lib/errors.ts';
import { ExampleRepository } from './repository.ts';

export const ExampleService = {
  async create(data: CreateExample) {
    const existing = await ExampleRepository.findByDate(data.date);
    if (existing) throw new ConflictError('この日付のデータは既に存在します');
    return ExampleRepository.create(data);
  },

  async getById(id: string) {
    const record = await ExampleRepository.findById(id);
    if (!record) throw new NotFoundError('データが見つかりません');
    return record;
  },

  async update(id: string, data: UpdateExample) {
    const record = await ExampleRepository.update(id, data);
    if (!record) throw new NotFoundError('データが見つかりません');
    return record;
  },

  async delete(id: string) {
    const deleted = await ExampleRepository.delete(id);
    if (!deleted) throw new NotFoundError('データが見つかりません');
  },
};
