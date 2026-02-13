import '@std/dotenv/load';
import { app } from './app.ts';
import { logger } from './middleware/logger.ts';

// フロントエンドのRPCクライアントが使用する型をエクスポート
export type { AppType } from './app.ts';

const port = Number(Deno.env.get('API_PORT')) || 3000;
const host = Deno.env.get('API_HOST') || '0.0.0.0';

logger.info`Starting server on ${host}:${port}`;

Deno.serve({ port, hostname: host }, app.fetch);

logger.info`Server running at http://${host}:${port}`;
