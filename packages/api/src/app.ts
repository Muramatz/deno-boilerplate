import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { exampleRoutes } from './features/example/index.ts';
import { healthRoutes } from './features/health/index.ts';
import { errorHandler, loggerMiddleware } from './middleware/index.ts';

const app = new OpenAPIHono();
const isDevelopment = Deno.env.get('DENO_ENV') !== 'production';

// ミドルウェアチェーン
app.use('*', loggerMiddleware);
app.use(
  '*',
  cors({
    origin: (Deno.env.get('CORS_ORIGINS') || 'http://localhost:5173').split(','),
    credentials: true,
  }),
);

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

// 404ハンドラ
app.notFound((c) => {
  return c.json({ error: { message: 'Not Found' } }, 404);
});

export { app };

// RPCクライアントの型推論用（routesチェーンの結果型）
export type AppType = typeof routes;
