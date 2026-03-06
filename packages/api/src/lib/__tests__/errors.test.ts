import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../errors.ts';

describe('AppError', () => {
  it('has statusCode and message', () => {
    const error = new AppError(500, 'Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('AppError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('has 404 status code', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('NotFoundError');
    expect(error).toBeInstanceOf(AppError);
  });

  it('accepts a custom message', () => {
    const error = new NotFoundError('User not found');
    expect(error.message).toBe('User not found');
  });
});

describe('ConflictError', () => {
  it('has 409 status code', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.name).toBe('ConflictError');
  });
});

describe('ValidationError', () => {
  it('has 400 status code', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });
});
