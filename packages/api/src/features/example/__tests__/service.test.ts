import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { ConflictError, NotFoundError } from '@/lib/errors.ts';
import { ExampleService } from '../service.ts';
import { ExampleRepository } from '../repository.ts';

describe('ExampleService', () => {
  useTestDb();

  describe('create', () => {
    it('新しいデータを作成できる', async () => {
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

    it('同一日付が存在する場合ConflictErrorを投げる', async () => {
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
    it('IDでデータを取得できる', async () => {
      const created = await ExampleRepository.create({
        date: '2025-02-01',
        field2: 'get test',
      });

      const record = await ExampleService.getById(created.id);

      expect(record.id).toBe(created.id);
      expect(record.field2).toBe('get test');
    });

    it('存在しない場合NotFoundErrorを投げる', async () => {
      await expect(
        ExampleService.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('update', () => {
    it('データを更新できる', async () => {
      const created = await ExampleRepository.create({
        date: '2025-03-01',
        field1: false,
        field2: 'original',
      });

      const updated = await ExampleService.update(created.id, {
        field2: 'updated',
      });

      expect(updated.field2).toBe('updated');
      expect(updated.field1).toBe(false); // 変更なし
    });

    it('存在しない場合NotFoundErrorを投げる', async () => {
      await expect(
        ExampleService.update('00000000-0000-0000-0000-000000000000', {
          field2: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('データを削除できる', async () => {
      const created = await ExampleRepository.create({
        date: '2025-04-01',
        field2: 'delete test',
      });

      // 例外が投げられなければ成功
      await ExampleService.delete(created.id);

      // 削除後は取得できない
      await expect(
        ExampleService.getById(created.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('存在しない場合NotFoundErrorを投げる', async () => {
      await expect(
        ExampleService.delete('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
