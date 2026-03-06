import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { ExampleRepository } from '../repository.ts';

describe('ExampleRepository', () => {
  useTestDb();

  describe('create', () => {
    it('creates a record', async () => {
      const record = await ExampleRepository.create({
        date: '2025-01-15',
        field1: true,
        field2: 'test',
      });

      expect(record.id).toBeDefined();
      expect(record.date).toBe('2025-01-15');
      expect(record.field1).toBe(true);
      expect(record.field2).toBe('test');
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
    });

    it('uses false as default for field1', async () => {
      const record = await ExampleRepository.create({
        date: '2025-02-01',
        field2: 'default test',
      });

      expect(record.field1).toBe(false);
    });

    it('throws on unique date constraint violation', async () => {
      await ExampleRepository.create({ date: '2025-03-01', field2: 'first' });

      await expect(
        ExampleRepository.create({ date: '2025-03-01', field2: 'duplicate' }),
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('gets a record by id', async () => {
      const created = await ExampleRepository.create({
        date: '2025-04-01',
        field2: 'findById test',
      });

      const found = await ExampleRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.date).toBe('2025-04-01');
      expect(found!.field2).toBe('findById test');
    });

    it('returns null for unknown id', async () => {
      const found = await ExampleRepository.findById(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('returns records ordered by createdAt desc', async () => {
      const first = await ExampleRepository.create({
        date: '2025-10-01',
        field2: 'first',
      });
      const second = await ExampleRepository.create({
        date: '2025-10-02',
        field2: 'second',
      });

      const list = await ExampleRepository.list();

      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list[0]!.id).toBe(second.id);
      expect(list[1]!.id).toBe(first.id);
    });
  });

  describe('findByDate', () => {
    it('gets a record by date', async () => {
      const created = await ExampleRepository.create({
        date: '2025-05-01',
        field2: 'findByDate test',
      });

      const found = await ExampleRepository.findByDate('2025-05-01');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.field2).toBe('findByDate test');
    });

    it('returns null for unknown date', async () => {
      const found = await ExampleRepository.findByDate('1999-12-31');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a record', async () => {
      const created = await ExampleRepository.create({
        date: '2025-06-01',
        field1: false,
        field2: 'original',
      });

      const updated = await ExampleRepository.update(created.id, {
        field1: true,
        field2: 'modified',
      });

      expect(updated).not.toBeNull();
      expect(updated!.field1).toBe(true);
      expect(updated!.field2).toBe('modified');
      expect(updated!.date).toBe('2025-06-01');
    });

    it('updates updatedAt timestamp', async () => {
      const created = await ExampleRepository.create({
        date: '2025-07-01',
        field2: 'timestamp test',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await ExampleRepository.update(created.id, {
        field2: 'timestamp updated',
      });

      expect(updated).not.toBeNull();
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(
        created.updatedAt.getTime(),
      );
    });

    it('returns null for unknown id', async () => {
      const result = await ExampleRepository.update(
        '00000000-0000-0000-0000-000000000000',
        { field2: 'noop' },
      );

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes a record and returns true', async () => {
      const created = await ExampleRepository.create({
        date: '2025-08-01',
        field2: 'delete test',
      });

      const result = await ExampleRepository.delete(created.id);

      expect(result).toBe(true);
    });

    it('returns null from findById after delete', async () => {
      const created = await ExampleRepository.create({
        date: '2025-09-01',
        field2: 'verify deleted',
      });

      await ExampleRepository.delete(created.id);
      const found = await ExampleRepository.findById(created.id);

      expect(found).toBeNull();
    });

    it('returns false for unknown id', async () => {
      const result = await ExampleRepository.delete(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(result).toBe(false);
    });
  });
});
