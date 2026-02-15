import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';

const connectionString = Deno.env.get('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/app_db';

const adapter = new PrismaPg({ connectionString });

export let prisma = new PrismaClient({ adapter });

/** テスト用: Prisma インスタンスを差し替える（ESM live binding 経由で全モジュールに反映） */
export function setPrisma(newPrisma: PrismaClient) {
  prisma = newPrisma;
}
