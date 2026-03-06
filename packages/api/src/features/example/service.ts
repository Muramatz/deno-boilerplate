import type { CreateExample, UpdateExample } from './schema.ts';
import { ConflictError, NotFoundError } from '@/lib/errors.ts';
import { ExampleRepository } from './repository.ts';

export const ExampleService = {
  list() {
    return ExampleRepository.list();
  },

  async create(data: CreateExample) {
    const existing = await ExampleRepository.findByDate(data.date);
    if (existing) throw new ConflictError('A record already exists for this date.');
    return ExampleRepository.create(data);
  },

  async getById(id: string) {
    const record = await ExampleRepository.findById(id);
    if (!record) throw new NotFoundError('Record not found.');
    return record;
  },

  async update(id: string, data: UpdateExample) {
    const record = await ExampleRepository.update(id, data);
    if (!record) throw new NotFoundError('Record not found.');
    return record;
  },

  async delete(id: string) {
    const deleted = await ExampleRepository.delete(id);
    if (!deleted) throw new NotFoundError('Record not found.');
  },
};
