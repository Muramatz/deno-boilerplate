import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './tables.ts';

const connectionString = Deno.env.get('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/app_db';

/**
 * Neon (Deno Deploy) → drizzle-orm/neon-http (HTTP, ステートレス)
 * ローカル開発        → drizzle-orm/postgres-js (TCP)
 */
const isNeon = connectionString.includes('neon.tech');

export type Database = NeonHttpDatabase<typeof schema>;

let _db: Database;

if (isNeon) {
  const { drizzle } = await import('drizzle-orm/neon-http');
  _db = drizzle(connectionString, { schema });
} else {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  _db = drizzle(connectionString, { schema }) as unknown as Database;
}

export let db: Database = _db;

/** テスト用: DBインスタンスを差し替える（ESM live binding経由で全モジュールに反映） */
export function setDb(newDb: Database) {
  db = newDb;
}
