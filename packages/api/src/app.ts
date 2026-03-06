import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { serveStatic } from 'hono/deno';
import { cors } from 'hono/cors';
import { exampleRoutes } from './features/example/index.ts';
import { healthRoutes } from './features/health/index.ts';
import { errorHandler, logger, loggerMiddleware } from './middleware/index.ts';

const app = new OpenAPIHono();
const env = Deno.env.get('DENO_ENV');
const isDenoDeploy = Boolean(Deno.env.get('DENO_DEPLOYMENT_ID')) ||
  Boolean(Deno.env.get('DENO_REGION'));
const isDevelopment = env === 'development' || (!env && !isDenoDeploy);

// Middleware chain
app.use('*', loggerMiddleware);

// CORS: development only (production serves API + SPA on same origin)
if (isDevelopment) {
  app.use(
    '*',
    cors({
      origin: (Deno.env.get('CORS_ORIGINS') || 'http://localhost:5173').split(','),
      credentials: true,
    }),
  );
}

// Global error handler
app.onError(errorHandler);

// Register routes (method chaining preserves RPC type inference)
const routes = app
  .route('/api/health', healthRoutes)
  .route('/api/example', exampleRoutes);

function hasIndexHtml(dir: string): boolean {
  const normalized = dir.endsWith('/') ? dir.slice(0, -1) : dir;
  try {
    return Deno.statSync(`${normalized}/index.html`).isFile;
  } catch {
    return false;
  }
}

function resolveStaticDir(): string {
  // Default is app-local dist. Override with STATIC_DIR for atypical launch CWD.
  return Deno.env.get('STATIC_DIR') || './dist';
}

// OpenAPI docs (development only)
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

// Static asset serving + SPA fallback (production only)
// In development, Vite serves assets and proxies /api to this server.
if (!isDevelopment) {
  const staticDir = resolveStaticDir();
  const hasStatic = hasIndexHtml(staticDir);
  logger.info`Runtime mode: production (env=${env ?? '<unset>'}, deploy=${isDenoDeploy})`;
  logger.info`Using static dir: ${staticDir}`;
  logger.info`Static index present: ${hasStatic}`;

  if (hasStatic) {
    // Serve built static files (JS/CSS/images)
    app.use('*', serveStatic({ root: staticDir }));

    // SPA fallback: return index.html for unmatched non-API and extensionless routes.
    // Extension paths (e.g. /missing.js) stay real 404s.
    app.get('*', (c, next) => {
      const path = c.req.path;
      if (path.startsWith('/api') || path.includes('.')) return next();
      return serveStatic({ root: staticDir, path: 'index.html' })(c, next);
    });
  } else {
    logger.warning`Static assets are missing. Root path will return 404.`;
  }
}

// 404 handler for API routes (non-API production paths are handled by SPA fallback)
app.notFound((c) => {
  return c.json({ error: { message: 'Not Found' } }, 404);
});

export { app };

// Result type of route chain for RPC client type inference
export type AppType = typeof routes;
