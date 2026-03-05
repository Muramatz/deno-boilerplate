import { afterAll, afterEach, beforeAll } from '@std/testing/bdd';
import { server } from './mocks/server.ts';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
