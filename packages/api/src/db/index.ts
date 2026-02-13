import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './tables.ts';

const connectionString = Deno.env.get('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/app_db';

const client = postgres(connectionString);
export let db = drizzle(client, { schema });
export type Database = typeof db;

/** テスト用: DBインスタンスを差し替える */
export function setDb(newDb: Database) {
  db = newDb;
}
