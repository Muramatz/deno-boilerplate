import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { serveStatic } from 'hono/deno';
import { cors } from 'hono/cors';
import { exampleRoutes } from './features/example/index.ts';
import { healthRoutes } from './features/health/index.ts';
import { errorHandler, loggerMiddleware } from './middleware/index.ts';

const app = new OpenAPIHono();
const isDevelopment = Deno.env.get('DENO_ENV') !== 'production';

// ミドルウェアチェーン
app.use('*', loggerMiddleware);

// CORS: 開発時のみ（本番はAPIとSPAが同一オリジン）
if (isDevelopment) {
  app.use(
    '*',
    cors({
      origin: (Deno.env.get('CORS_ORIGINS') || 'http://localhost:5173').split(','),
      credentials: true,
    }),
  );
}

// グローバルエラーハンドラ
app.onError(errorHandler);

// ルート登録（メソッドチェーンでRPC型推論を保持）
const routes = app
  .route('/api/health', healthRoutes)
  .route('/api/example', exampleRoutes);

// OpenAPIドキュメント（開発環境のみ）
if (isDevelopment) {
  app.doc31('/api/docs', {
    openapi: '3.1.0',
    info: {
      title: 'My App API',
      version: '1.0.0',
    },
  });
  app.get('/api/swagger', swaggerUI({ url: '/api/docs' }));
}

// 静的ファイル配信 + SPAフォールバック（本番のみ）
// 開発時はVite devサーバーが静的ファイルを配信し、/apiはproxyでAPIへ転送
if (!isDevelopment) {
  const staticDir = Deno.env.get('STATIC_DIR') || './packages/web/dist';

  // Viteビルド出力の静的ファイル (JS, CSS, images) を配信
  app.use('*', serveStatic({ root: staticDir }));

  // SPAフォールバック: /api・拡張子付きパス以外の未マッチルートにindex.htmlを返す
  // 拡張子付き（/missing.js等）はserveStaticで見つからなかった＝本当の404なのでスキップ
  app.get('*', (c, next) => {
    const path = c.req.path;
    if (path.startsWith('/api') || path.includes('.')) return next();
    return serveStatic({ root: staticDir, path: 'index.html' })(c, next);
  });
}

// 404ハンドラ（API用 — 本番の非APIルートはSPAフォールバックで処理済み）
app.notFound((c) => {
  return c.json({ error: { message: 'Not Found' } }, 404);
});

export { app };

// RPCクライアントの型推論用（routesチェーンの結果型）
export type AppType = typeof routes;
