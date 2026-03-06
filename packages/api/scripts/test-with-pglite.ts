import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 55432;
const DEFAULT_DB_PATH = 'memory://';
const DEFAULT_DB_NAME = 'postgres';

function buildTestDatabaseUrl(host: string, port: number, dbName: string) {
  return `postgresql://postgres:postgres@${host}:${port}/${dbName}?sslmode=disable`;
}

async function runCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
) {
  const child = new Deno.Command(command, {
    args,
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  }).spawn();

  const status = await child.status;
  if (!status.success) {
    throw new Error(`Command failed: ${command} ${args.join(' ')} (exit ${status.code})`);
  }
}

const host = Deno.env.get('PGLITE_TEST_HOST') ?? DEFAULT_HOST;
const port = Number.parseInt(Deno.env.get('PGLITE_TEST_PORT') ?? `${DEFAULT_PORT}`, 10);
const dbPath = Deno.env.get('PGLITE_TEST_DB_PATH') ?? DEFAULT_DB_PATH;
const dbName = Deno.env.get('PGLITE_TEST_DB_NAME') ?? DEFAULT_DB_NAME;
const testDatabaseUrl = buildTestDatabaseUrl(host, port, dbName);
const childEnv = {
  ...Deno.env.toObject(),
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
};

const db = await PGlite.create(dbPath);
const server = new PGLiteSocketServer({ db, host, port });

console.log(`Starting PGlite test DB on ${host}:${port}`);
await server.start();

try {
  console.log('Applying schema with prisma db push...');
  await runCommand(
    'deno',
    [
      'run',
      '-A',
      '--allow-scripts=npm:prisma@7.4.2,npm:@prisma/engines@7.4.2',
      'npm:prisma',
      'db',
      'push',
    ],
    childEnv,
  );

  const forwardedArgs = Deno.args.length > 0 ? Deno.args : ['src/'];
  console.log('Running API tests...');
  await runCommand(
    'deno',
    [
      'test',
      '--allow-net',
      '--allow-env',
      '--allow-read',
      '--allow-write',
      '--allow-sys',
      '--allow-ffi',
      ...forwardedArgs,
    ],
    childEnv,
  );
} finally {
  const stopPromise = server.stop().catch((error) => {
    console.warn('Warning: failed to stop PGlite socket server cleanly:', error);
  });
  await Promise.race([
    stopPromise,
    new Promise((resolve) => setTimeout(resolve, 1_000)),
  ]);
  await db.close();
}
