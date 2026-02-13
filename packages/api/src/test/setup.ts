import { afterAll, afterEach, beforeAll, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { setDb, type Database } from '@/db/index.ts';

let pgliteClient: { close(): Promise<void> } | null = null;
let testDb: Database | null = null;

async function initTestDb(): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('@/db/schema.ts');

  const client = new PGlite();
  pgliteClient = client;
  // deno-lint-ignore no-explicit-any
  const db = drizzle(client as any, { schema }) as unknown as Database;

  const { pushSchema } = await import('drizzle-kit/api');
  // deno-lint-ignore no-explicit-any
  const { apply } = await pushSchema(schema, db as any);
  await apply();

  setDb(db);
  testDb = db;
  return db;
}

async function cleanupTables() {
  if (!testDb) return;
  const schema = await import('@/db/schema.ts');
  for (const table of Object.values(schema)) {
    await testDb.delete(table);
  }
}

async function closePglite() {
  if (pgliteClient) await pgliteClient.close();
  pgliteClient = null;
  testDb = null;
}

/** describe直下で呼ぶだけでDB初期化・テーブル掃除・PGLite終了を自動登録 */
export function useTestDb() {
  beforeAll(async () => {
    await initTestDb();
  });
  afterEach(async () => {
    await cleanupTables();
  });
  afterAll(async () => {
    await closePglite();
  });
}

export { describe, expect, it };
