import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { ConflictError, NotFoundError } from '@/lib/errors.ts';
import { ExampleService } from '../service.ts';
import { ExampleRepository } from '../repository.ts';

describe('ExampleService', () => {
  useTestDb();

  describe('create', () => {
    it('creates a new record', async () => {
      const record = await ExampleService.create({
        date: '2025-01-15',
        field1: true,
        field2: 'test',
      });

      expect(record.id).toBeDefined();
      expect(record.date).toBe('2025-01-15');
      expect(record.field1).toBe(true);
      expect(record.field2).toBe('test');
    });

    it('throws ConflictError when date already exists', async () => {
      await ExampleRepository.create({
        date: '2025-01-15',
        field2: 'first',
      });

      await expect(
        ExampleService.create({
          date: '2025-01-15',
          field1: false,
          field2: 'second',
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('getById', () => {
    it('gets data by id', async () => {
      const created = await ExampleRepository.create({
        date: '2025-02-01',
        field2: 'get test',
      });

      const record = await ExampleService.getById(created.id);

      expect(record.id).toBe(created.id);
      expect(record.field2).toBe('get test');
    });

    it('throws NotFoundError when not found', async () => {
      await expect(
        ExampleService.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('list', () => {
    it('returns a list of records', async () => {
      const created = await ExampleRepository.create({
        date: '2025-02-15',
        field2: 'list test',
      });

      const list = await ExampleService.list();

      expect(list.length).toBeGreaterThan(0);
      expect(list.some((row) => row.id === created.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('updates data', async () => {
      const created = await ExampleRepository.create({
        date: '2025-03-01',
        field1: false,
        field2: 'original',
      });

      const updated = await ExampleService.update(created.id, {
        field2: 'updated',
      });

      expect(updated.field2).toBe('updated');
      expect(updated.field1).toBe(false); // unchanged
    });

    it('throws NotFoundError when not found', async () => {
      await expect(
        ExampleService.update('00000000-0000-0000-0000-000000000000', {
          field2: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes data', async () => {
      const created = await ExampleRepository.create({
        date: '2025-04-01',
        field2: 'delete test',
      });

      // Success if no exception is thrown.
      await ExampleService.delete(created.id);

      // Record cannot be fetched after deletion.
      await expect(
        ExampleService.getById(created.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when not found', async () => {
      await expect(
        ExampleService.delete('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
