import { afterAll, afterEach, beforeAll, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import { setPrisma } from '@/db/index.ts';

let testPrisma: PrismaClient | null = null;

function createTestPrisma(): PrismaClient {
  const connectionString = Deno.env.get('TEST_DATABASE_URL') ??
    'postgresql://postgres:postgres@127.0.0.1:55432/postgres';
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Call inside a describe block to auto-register DB setup/cleanup/teardown.
 *
 * By default, `deno task test` starts an in-memory PGlite server and applies
 * schema via Prisma before executing tests.
 */
export function useTestDb() {
  beforeAll(() => {
    testPrisma = createTestPrisma();
    setPrisma(testPrisma);
  });
  afterEach(async () => {
    if (!testPrisma) return;
    await testPrisma.$executeRawUnsafe(
      'TRUNCATE TABLE examples RESTART IDENTITY CASCADE',
    );
  });
  afterAll(async () => {
    if (testPrisma) await testPrisma.$disconnect();
    testPrisma = null;
  });
}

export { describe, expect, it };
