// ローカル開発用に.envを読み込む。Deno Deploy上ではDeno.readTextFileSyncが
// 利用不可のため安全にno-op（環境変数はダッシュボードで設定）
import '@std/dotenv/load';
import { app } from './app.ts';
import { logger } from './middleware/logger.ts';

// フロントエンドのRPCクライアントが使用する型をエクスポート
export type { AppType } from './app.ts';

const port = Number(Deno.env.get('API_PORT')) || 3000;
const host = Deno.env.get('API_HOST') || '0.0.0.0';

logger.info`Starting server on ${host}:${port}`;

// Deno Deployではport/hostnameはプラットフォームが管理（指定は無視される）
Deno.serve({ port, hostname: host }, app.fetch);

logger.info`Server running at http://${host}:${port}`;
