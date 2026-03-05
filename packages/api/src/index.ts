// Load .env for local development. On Deno Deploy this safely no-ops because
// reading local files is unavailable and env vars are provided by the platform.
import '@std/dotenv/load';
import { app } from './app.ts';
import { logger } from './middleware/logger.ts';

// Export type used by the frontend RPC client.
export type { AppType } from './app.ts';

const port = Number(Deno.env.get('API_PORT')) || 3000;
const host = Deno.env.get('API_HOST') || '0.0.0.0';

logger.info`Starting server on ${host}:${port}`;

// On Deno Deploy, port/hostname are managed by the platform.
Deno.serve({ port, hostname: host }, app.fetch);

logger.info`Server running at http://${host}:${port}`;
