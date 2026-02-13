import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { ExampleRepository } from '../repository.ts';

describe('ExampleRepository', () => {
  useTestDb();

  describe('create', () => {
    it('レコードを作成できる', async () => {
      const record = await ExampleRepository.create({
        date: '2025-01-15',
        field1: true,
        field2: 'テスト',
      });

      expect(record.id).toBeDefined();
      expect(record.date).toBe('2025-01-15');
      expect(record.field1).toBe(true);
      expect(record.field2).toBe('テスト');
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
    });

    it('field1のデフォルト値はfalse', async () => {
      const record = await ExampleRepository.create({
        date: '2025-02-01',
        field2: 'default test',
      });

      expect(record.field1).toBe(false);
    });

    it('日付のユニーク制約違反でエラーになる', async () => {
      await ExampleRepository.create({ date: '2025-03-01', field2: 'first' });

      await expect(
        ExampleRepository.create({ date: '2025-03-01', field2: 'duplicate' }),
      ).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('IDでレコードを取得できる', async () => {
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

    it('存在しないIDでnullを返す', async () => {
      const found = await ExampleRepository.findById(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(found).toBeNull();
    });
  });

  describe('findByDate', () => {
    it('日付でレコードを取得できる', async () => {
      const created = await ExampleRepository.create({
        date: '2025-05-01',
        field2: 'findByDate test',
      });

      const found = await ExampleRepository.findByDate('2025-05-01');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.field2).toBe('findByDate test');
    });

    it('存在しない日付でnullを返す', async () => {
      const found = await ExampleRepository.findByDate('1999-12-31');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('レコードを更新できる', async () => {
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

    it('updatedAtが更新される', async () => {
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

    it('存在しないIDでnullを返す', async () => {
      const result = await ExampleRepository.update(
        '00000000-0000-0000-0000-000000000000',
        { field2: 'noop' },
      );

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('レコードを削除してtrueを返す', async () => {
      const created = await ExampleRepository.create({
        date: '2025-08-01',
        field2: 'delete test',
      });

      const result = await ExampleRepository.delete(created.id);

      expect(result).toBe(true);
    });

    it('削除後はfindByIdでnullを返す', async () => {
      const created = await ExampleRepository.create({
        date: '2025-09-01',
        field2: 'verify deleted',
      });

      await ExampleRepository.delete(created.id);
      const found = await ExampleRepository.findById(created.id);

      expect(found).toBeNull();
    });

    it('存在しないIDでfalseを返す', async () => {
      const result = await ExampleRepository.delete(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(result).toBe(false);
    });
  });
});
