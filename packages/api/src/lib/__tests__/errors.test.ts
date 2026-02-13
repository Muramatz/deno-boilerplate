import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../errors.ts';

describe('AppError', () => {
  it('statusCodeとmessageを持つ', () => {
    const error = new AppError(500, 'Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('AppError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('404ステータスコードを持つ', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('NotFoundError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('カスタムメッセージを受け取れる', () => {
    const error = new NotFoundError('ユーザーが見つかりません');
    expect(error.message).toBe('ユーザーが見つかりません');
  });
});

describe('ConflictError', () => {
  it('409ステータスコードを持つ', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.name).toBe('ConflictError');
  });
});

describe('ValidationError', () => {
  it('400ステータスコードを持つ', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });
});
