import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { createExampleSchema, updateExampleSchema } from '../example.ts';

describe('createExampleSchema', () => {
  it('有効なデータでパースできる', () => {
    const result = createExampleSchema.parse({
      field1: true,
      field2: 'test',
      date: '2024-01-15',
    });
    expect(result.field1).toBe(true);
    expect(result.field2).toBe('test');
    expect(result.date).toBeInstanceOf(Date);
  });

  it('field1のデフォルト値はfalse', () => {
    const result = createExampleSchema.parse({
      field2: 'test',
      date: '2024-01-15',
    });
    expect(result.field1).toBe(false);
  });

  it('必須フィールドが欠けている場合エラー', () => {
    expect(() => createExampleSchema.parse({ field1: true })).toThrow();
  });
});

describe('updateExampleSchema', () => {
  it('部分更新できる', () => {
    const result = updateExampleSchema.parse({ field1: true });
    expect(result.field1).toBe(true);
    expect(result.field2).toBeUndefined();
  });

  it('空オブジェクトも有効（デフォルト値は適用される）', () => {
    const result = updateExampleSchema.parse({});
    // Zod v4: partial()でもdefault()は保持される
    expect(result.field1).toBe(false);
    expect(result.field2).toBeUndefined();
  });
});
