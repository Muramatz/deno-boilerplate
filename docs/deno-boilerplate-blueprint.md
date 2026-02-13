# ボイラープレート実装計画書（Deno版）

> このドキュメントはプロジェクトの技術構成を Deno ランタイムで再現するための実装計画書です。
> ドメイン知識・インフラ・外部連携は含みません。純粋な技術ボイラープレートのみを対象とします。

---

## 目次

1. [技術スタック一覧](#1-技術スタック一覧)
2. [モノレポ基盤セットアップ](#2-モノレポ基盤セットアップ)
3. [packages/shared のセットアップ](#3-packagesshared-のセットアップ)
4. [packages/api のセットアップ](#4-packagesapi-のセットアップ)
5. [packages/web のセットアップ](#5-packagesweb-のセットアップ)
6. [Lint / Format 設定](#6-lint--format-設定)
7. [テスト基盤](#7-テスト基盤)
8. [フロントエンド←→バックエンド型安全RPC接続](#8-フロントエンドバックエンド型安全rpc接続)
9. [Feature-Based Architecture ルール](#9-feature-based-architecture-ルール)
10. [命名規約・コード規約](#10-命名規約コード規約)

---

## 1. 技術スタック一覧

| カテゴリ                      | 技術                                  | バージョン    | 用途                                                                                                                        |
| ----------------------------- | ------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **言語**                      | TypeScript                            | Deno組み込み  | 全パッケージ共通、strict mode                                                                                               |
| **ランタイム/パッケージ管理** | Deno                                  | >=2.x         | ランタイム + ワークスペース + パッケージ管理                                                                                |
| **フロントエンド**            | React                                 | ^19.2         | UI ライブラリ                                                                                                               |
| **ビルド**                    | Vite                                  | ^7.3          | フロントエンドバンドラー + 開発サーバー                                                                                     |
| **CSS**                       | Tailwind CSS                          | ^4.1          | ユーティリティファーストCSS（Viteプラグイン統合）                                                                           |
| **状態管理**                  | Zustand                               | ^5.0          | クライアント側UI状態                                                                                                        |
| **サーバー状態**              | TanStack Query                        | ^5.90         | サーバーデータのキャッシュ・同期                                                                                            |
| **フォーム**                  | react-hook-form + @hookform/resolvers | ^7.71 / ^3.10 | フォームバリデーション（Zodと統合）                                                                                         |
| **ルーティング**              | react-router-dom                      | ^7.13         | SPA ルーティング                                                                                                            |
| **バックエンド**              | Hono                                  | ^4.11         | 軽量 Web フレームワーク                                                                                                     |
| **OpenAPI**                   | @hono/zod-openapi                     | ^1.2          | Zodスキーマから自動ドキュメント生成                                                                                         |
| **ORM**                       | Drizzle ORM                           | ^0.45         | 型安全なDB操作                                                                                                              |
| **DBドライバ**                | postgres (postgres.js)                | ^3.4          | PostgreSQL接続                                                                                                              |
| **バリデーション**            | Zod                                   | ^4.0          | フロント・バック共有スキーマ（※@hono/zod-openapi v1.xはZod v4必須。v4では`.partial()`でも`.default()`が保持される点に注意） |
| **ロギング**                  | @logtape/logtape                      | ^0.10         | 構造化ログ（マルチランタイム対応）                                                                                          |
| **Lint/Format**               | deno lint / deno fmt                  | Deno組み込み  | Linter + Formatter                                                                                                          |
| **テスト**                    | deno test + @std/testing              | Deno組み込み  | ユニット・統合テスト                                                                                                        |
| **テストDB**                  | PGLite (@electric-sql/pglite)         | ^0.3          | インメモリPostgreSQL（WASM）                                                                                                |
| **UIテスト**                  | @testing-library/react                | ^16.3         | Reactコンポーネントテスト                                                                                                   |
| **モック**                    | MSW (Mock Service Worker)             | ^2.12         | API モック（フロントエンドテスト用）                                                                                        |
| **日付**                      | date-fns                              | ^4.1          | バックエンド日付操作                                                                                                        |
| **日付(FE)**                  | dayjs                                 | ^1.11         | フロントエンド日付操作                                                                                                      |
| **クラス結合**                | clsx                                  | ^2.1          | className の条件結合                                                                                                        |
| **環境変数**                  | @std/dotenv                           | Deno標準      | .envファイル読み込み                                                                                                        |

### pnpm/Node.js版から削除された依存

| 削除された依存         | 理由                            |
| ---------------------- | ------------------------------- |
| `@hono/node-server`    | `Deno.serve` で代替             |
| `dotenv`               | `@std/dotenv` で代替            |
| `pino` + `pino-pretty` | `@logtape/logtape` で代替       |
| `@biomejs/biome`       | `deno lint` / `deno fmt` で代替 |
| `vitest`               | `deno test` で代替              |
| `tsx`                  | Denoがネイティブで.ts実行       |
| `tsc-alias`            | import mapで解決                |
| `typescript`           | Deno組み込み                    |

---

## 2. モノレポ基盤セットアップ

### 2.1 ディレクトリ構造

```
project-root/
├── deno.json                 # ワークスペース + lint/fmt + compilerOptions（全統合）
├── deno.lock                 # ロックファイル（自動生成）
├── compose.yml               # ローカルDB用Docker Compose
├── .env.example              # 環境変数テンプレート
├── .gitignore
├── .vscode/
│   └── settings.json         # Deno拡張有効化
├── docs/                     # ドキュメント
└── packages/
    ├── shared/               # 共有スキーマ・型・定数
    ├── api/                  # バックエンド（Hono on Deno）
    └── web/                  # フロントエンド（React + Vite on Deno）
```

### 2.2 ルート deno.json

```json
{
  "nodeModulesDir": "auto",
  "workspace": ["./packages/shared", "./packages/api", "./packages/web"],
  "imports": {
    "zod": "npm:zod@^3.24",
    "@std/assert": "jsr:@std/assert@^1",
    "@std/testing": "jsr:@std/testing@^1",
    "@std/expect": "jsr:@std/expect@^1",
    "@std/dotenv": "jsr:@std/dotenv@^0.225"
  },
  "tasks": {
    "dev": "deno task --recursive dev",
    "test": "deno test --recursive",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "fmt:check": "deno fmt --check",
    "clean": "rm -rf packages/*/dist packages/*/node_modules"
  },
  "fmt": {
    "semiColons": true,
    "singleQuote": true,
    "indentWidth": 2,
    "lineWidth": 100
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

**ポイント:**

- pnpm版の4ファイル（`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `biome.json`）が
  **`deno.json` 1つに統合**
- `workspace` でモノレポメンバーを定義
- ルートの `imports` は全ワークスペースメンバーに継承される
- `fmt` 設定はBiome版と同じルール（シングルクォート、セミコロンあり、インデント2、行幅100）
- **重要:** `deno task --recursive` / `deno task -r`
  はルート自身のタスクも実行するため、ルートに同名タスクがあると無限ループになる。`--filter`
  でパッケージを明示指定すること
- **重要:** `deno test packages/`
  はワークスペースメンバーごとにテストを重複実行する。`deno task --filter '<pkg>' test`
  で各メンバーのテストタスクを個別実行すること
- **重要:** `nodeModulesDir` はワークスペースルートでのみ指定可能（メンバーの deno.json
  では無視される）。Vite/Tailwind のために `"nodeModulesDir": "auto"` をルートに配置

### 2.3 .vscode/settings.json

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": [],
  "editor.defaultFormatter": "denoland.vscode-deno",
  "editor.formatOnSave": true
}
```

### 2.4 .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Temp files
*.tmp
*.temp
.cache/

# Drizzle
drizzle/meta/

# Docker
.docker/
```

### 2.5 compose.yml（ローカル開発DB）

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: <project-name>-db
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: <project_db_name>
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 2.6 .env.example

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/<project_db_name>

# API Server
API_PORT=3000
API_HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:3000

# Security
JWT_SECRET=your-jwt-secret-here
CORS_ORIGINS=http://localhost:5173

# Feature Flags
# ENABLE_FEATURE_X=true

# Environment
DENO_ENV=development
```

**ポイント:** `NODE_ENV` → `DENO_ENV` に変更。

---

## 3. packages/shared のセットアップ

### 3.1 役割

フロントエンドとバックエンドで共有する **Zod スキーマ**・**型定義**・**定数** を一元管理する。

### 3.2 deno.json

```json
{
  "name": "@<scope>/shared",
  "version": "0.0.0",
  "exports": "./src/index.ts",
  "tasks": {
    "check": "deno check src/**/*.ts"
  }
}
```

**ポイント:**

- 依存は **ルートの imports から Zod を継承**（ここでの宣言不要）
- `exports` がシンプル（`types` / `default` の分岐不要、DenoはTSを直接解決）
- TypeScript自体が不要（Deno組み込み）
- 消費側は `import { ... } from '@<scope>/shared'` で利用

### 3.3 ディレクトリ構造

```
packages/shared/src/
├── index.ts                  # バレルエクスポート（公開API）
├── constants/
│   ├── index.ts              # 定数の再エクスポート
│   └── <domain>.ts           # ドメイン定数（as const + 型導出）
├── schemas/
│   ├── index.ts              # スキーマの再エクスポート
│   ├── <entity>.ts           # エンティティごとのZodスキーマ
│   └── __tests__/
│       └── <entity>.test.ts  # deno test で実行
└── types/
    └── index.ts              # 型の再エクスポート（schemas/constantsから導出）
```

### 3.4 コードパターン

#### 定数定義パターン（`as const` + 型導出）

```typescript
// constants/example.ts
export const ITEMS = [
  { id: 'item1', name: 'アイテム1', order: 1 },
  { id: 'item2', name: 'アイテム2', order: 2 },
] as const;

export type ItemId = (typeof ITEMS)[number]['id'];
export const ITEM_IDS = ITEMS.map((i) => i.id);
```

#### Zodスキーマパターン（ベース → 拡張 → 部分更新）

```typescript
// schemas/example.ts
import { z } from 'zod';

// ベーススキーマ
export const baseItemSchema = z.object({
  field1: z.boolean().default(false),
  field2: z.string(),
});

// 作成スキーマ（ベース + 追加フィールド）
export const createItemSchema = baseItemSchema.extend({
  date: z.string().date(), // YYYY-MM-DD 文字列をバリデーション
});
export type CreateItem = z.infer<typeof createItemSchema>;

// 更新スキーマ（部分更新）
export const updateItemSchema = baseItemSchema.partial();
export type UpdateItem = z.infer<typeof updateItemSchema>;

// レスポンススキーマ（メタデータ付き）
export const itemSchema = baseItemSchema.extend({
  id: z.uuid(),
  date: z.string().date(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Item = z.infer<typeof itemSchema>;
```

#### バレルエクスポートパターン

```typescript
// index.ts
export * from './constants/index.ts';
export * from './schemas/index.ts';
export * from './types/index.ts';
```

```typescript
// types/index.ts — スキーマ・定数から導出した型を再エクスポート
export type { ItemId } from '../constants/index.ts';
export type { CreateItem, Item, UpdateItem } from '../schemas/index.ts';
```

**注意:** Denoではインポートパスに `.ts` 拡張子が必須。

---

## 4. packages/api のセットアップ

### 4.1 deno.json

```json
{
  "name": "@<scope>/api",
  "version": "0.0.0",
  "exports": "./src/index.ts",
  "imports": {
    "@hono/zod-openapi": "npm:@hono/zod-openapi@^1.2.1",
    "@hono/swagger-ui": "npm:@hono/swagger-ui@^0.5.3",
    "hono": "npm:hono@^4.11.6",
    "drizzle-orm": "npm:drizzle-orm@^0.45.1",
    "drizzle-orm/": "npm:/drizzle-orm@^0.45.1/",
    "postgres": "npm:postgres@^3.4.8",
    "date-fns": "npm:date-fns@^4.1.0",
    "@logtape/logtape": "jsr:@logtape/logtape@^0.10",
    "@electric-sql/pglite": "npm:@electric-sql/pglite@^0.3.15",
    "drizzle-kit": "npm:drizzle-kit@^0.31.8",
    "drizzle-kit/api": "npm:drizzle-kit@^0.31.8/api",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env --allow-read main.ts",
    "check": "deno check src/**/*.ts",
    "test": "deno test --allow-net --allow-env --allow-read --allow-write --allow-sys --allow-ffi src/",
    "db:generate": "deno run -A npm:drizzle-kit generate",
    "db:migrate": "deno run -A npm:drizzle-kit migrate",
    "db:studio": "deno run -A npm:drizzle-kit studio"
  },
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

**ポイント:**

- `tsx watch` → `deno run --watch`（ネイティブTS実行 + ホットリロード）
- `tsc && tsc-alias` ビルド → **不要**（Denoは.tsを直接実行）
- `@/` パスエイリアスは `imports` で解決（tsc-alias不要）
- `pino` → `@logtape/logtape`（Denoネイティブ対応ロガー）
- Denoの権限モデル: `--allow-net`, `--allow-env`, `--allow-read` を明示
- テストタスクには追加で `--allow-write --allow-sys --allow-ffi` が必要（`drizzle-kit/api` の
  `pushSchema` が内部で `os.homedir()` を呼ぶため `--allow-sys` が必須）
- `drizzle-orm/` のサブパスインポート用エントリも明示
- `drizzle-kit` を import map に含める（`drizzle.config.ts` の
  `import { defineConfig } from 'drizzle-kit'` をDenoが解決するため）

### 4.2 ディレクトリ構造

```
packages/api/src/
├── index.ts                          # エントリーポイント（Deno.serve + AppType再エクスポート）
├── app.ts                            # Honoアプリ定義・ルート集約・ミドルウェアチェーン
├── db/
│   ├── index.ts                      # Drizzle DB接続 + setDb()（テスト用DI）
│   └── schema.ts                     # 全featureスキーマの集約再エクスポート
├── features/
│   └── <feature-name>/
│       ├── index.ts                  # 公開API（routesとschemaのみ公開）
│       ├── schema.ts                 # Drizzleテーブル定義
│       ├── repository.ts            # データアクセス層
│       ├── service.ts               # ビジネスロジック層
│       ├── routes.ts                # Honoルートハンドラ
│       ├── openapi.ts       # OpenAPI用Zodスキーマ
│       └── __tests__/
│           ├── routes.test.ts       # 統合テスト
│           ├── service.test.ts      # ビジネスロジックテスト
│           └── repository.test.ts   # データ層テスト
├── lib/
│   ├── errors.ts                    # カスタムエラークラス
│   └── __tests__/
│       └── errors.test.ts
├── middleware/
│   ├── index.ts                     # ミドルウェア再エクスポート
│   ├── error-handler.ts             # グローバルエラーハンドラ
│   └── logger.ts                    # LogTapeロギングミドルウェア
└── test/
    └── setup.ts                     # テストセットアップ（PGLite + @std/testing）
```

### 4.3 エントリーポイント（src/index.ts）

```typescript
import '@std/dotenv/load';
import { app } from './app.ts';
import { logger } from './middleware/logger.ts';

// フロントエンドのRPCクライアントが使用する型をエクスポート
export type { AppType } from './app.ts';

const port = Number(Deno.env.get('API_PORT')) || 3000;
const host = Deno.env.get('API_HOST') || '0.0.0.0';

logger.info(`Starting server on ${host}:${port}`);

Deno.serve({ port, hostname: host }, app.fetch);

logger.info(`Server running at http://${host}:${port}`);
```

**Node.js版からの変更点:**

- `@hono/node-server` の `serve()` → `Deno.serve()`（ネイティブサーバー、高速）
- `dotenv/config` → `@std/dotenv/load`（Deno標準ライブラリ）
- `process.env` → `Deno.env.get()`
- インポートパスに `.ts` 拡張子が必要

### 4.4 アプリ定義（src/app.ts）

```typescript
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
      title: '<Project> API',
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
```

**変更点:**

- `process.env.NODE_ENV` → `Deno.env.get('DENO_ENV')`
- `process.env.CORS_ORIGINS` → `Deno.env.get('CORS_ORIGINS')`
- インポートパスに `.ts` 拡張子

**重要: `AppType` は `routes` チェーンの結果を `typeof` で取得する。これによりフロントエンドの
`hc<AppType>()` で全ルートの型安全なRPCが実現する。**

### 4.5 ミドルウェア

#### logger.ts — LogTapeロガー

```typescript
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import type { MiddlewareHandler } from 'hono';

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ['app'],
      sinks: ['console'],
      lowestLevel: 'info',
    },
  ],
});

export const logger = getLogger(['app']);

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req.raw;
  await next();
  const duration = Date.now() - start;
  logger.info`${method} ${url} ${c.res.status} ${duration}ms`;
};
```

**pino版からの変更点:**

- pino → LogTape（マルチランタイム対応、JSRで提供）
- テンプレートリテラルベースのログ出力（LogTapeの特徴）
- `pino-pretty` 不要（LogTapeのコンソールシンクが整形済み出力）

#### error-handler.ts — グローバルエラーハンドラ

```typescript
import type { ErrorHandler } from 'hono';
import { AppError } from '@/lib/errors.ts';
import { logger } from './logger.ts';

export const errorHandler: ErrorHandler = (err, c) => {
  logger.error`${err.message} ${err.stack} ${c.req.url} ${c.req.method}`;

  if (err instanceof AppError) {
    return c.json({ error: { message: err.message } }, err.statusCode as 400 | 404 | 409 | 500);
  }

  const isDevelopment = Deno.env.get('DENO_ENV') !== 'production';
  return c.json(
    { error: { message: isDevelopment ? err.message : 'Internal Server Error' } },
    500,
  );
};
```

### 4.6 カスタムエラークラス（src/lib/errors.ts）

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message);
    this.name = 'ValidationError';
  }
}
```

### 4.7 DB接続（src/db/index.ts）

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

const connectionString = Deno.env.get('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/<db_name>';

const client = postgres(connectionString);
export let db = drizzle(client, { schema });
export type Database = typeof db;

/** テスト用: DBインスタンスを差し替える（ESM live binding経由で全モジュールに反映） */
export function setDb(newDb: Database) {
  db = newDb;
}
```

**ポイント:**

- `export let db` にすることで、ESM live binding により `setDb()`
  の変更が全インポート先に即時反映される
- テスト時は PGLite インスタンスを `setDb()` で注入し、本番コードを一切変更せずにテスト可能
- `vi.mock` のようなモジュールモックが不要なシンプルな依存注入パターン

### 4.8 DBスキーマ集約（src/db/schema.ts）

```typescript
// 各featureのschema.tsをここで集約再エクスポート
// NOTE: drizzle-kit はNode.jsで実行されるため @/ エイリアスを解決できない。相対パスを使用。
export { examples } from '../features/example/schema.ts';
// export { users } from '../features/user/schema.ts';
```

### 4.9 Drizzle設定（drizzle.config.ts）

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: Deno.env.get('DATABASE_URL') || 'postgresql://postgres:postgres@localhost:5432/<db_name>',
  },
});
```

### 4.10 Feature レイヤーパターン（各ファイルの責務）

```
routes.ts → service.ts → repository.ts → schema.ts (DB)
     ↓           ↓              ↓
  HTTP入出力   ビジネスロジック   データ操作
  Zod検証     エラー判定        Drizzle SQL
              集計・変換         CRUD
```

#### schema.ts — Drizzle テーブル定義

```typescript
import { boolean, date, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const examples = pgTable(
  'examples',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull(),
    field1: boolean('field1').default(false).notNull(),
    field2: text('field2').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('examples_date_unique').on(table.date)],
);

export type ExampleRecord = typeof examples.$inferSelect;
export type NewExampleRecord = typeof examples.$inferInsert;
```

#### repository.ts — データアクセス層

```typescript
import { eq } from 'drizzle-orm';
import { db } from '@/db/index.ts';
import { type ExampleRecord, examples, type NewExampleRecord } from './schema.ts';

export const ExampleRepository = {
  async create(data: NewExampleRecord): Promise<ExampleRecord> {
    const [record] = await db.insert(examples).values(data).returning();
    if (!record) throw new Error('Failed to create record');
    return record;
  },

  async findById(id: string): Promise<ExampleRecord | null> {
    const [record] = await db.select().from(examples).where(eq(examples.id, id));
    return record ?? null;
  },

  async findByDate(date: string): Promise<ExampleRecord | null> {
    const [record] = await db
      .select()
      .from(examples)
      .where(eq(examples.date, date));
    return record ?? null;
  },

  async update(id: string, data: Partial<NewExampleRecord>): Promise<ExampleRecord | null> {
    const [record] = await db
      .update(examples)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(examples.id, id))
      .returning();
    return record ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(examples).where(eq(examples.id, id)).returning({
      id: examples.id,
    });
    return result.length > 0;
  },
};
```

**パターン:**

- クラスではなくオブジェクトリテラル（インスタンス生成不要）
- 見つからない場合は `null` を返す（エラーは投げない）
- `update` 時に `updatedAt` を自動更新
- **`date` カラムは `mode: 'string'` を使用:** `mode: 'date'` だと postgres.js が JavaScript `Date`
  をフルタイムスタンプとして送信し、`eq()` 比較が失敗する。`mode: 'string'`（`YYYY-MM-DD`
  文字列）にして、OpenAPI スキーマ（`z.string().date()`）でフォーマットを検証する設計が正しい

#### service.ts — ビジネスロジック層

```typescript
import type { CreateExample } from '@<scope>/shared';
import { ConflictError, NotFoundError } from '@/lib/errors.ts';
import { ExampleRepository } from './repository.ts';

export const ExampleService = {
  async create(data: CreateExample) {
    const existing = await ExampleRepository.findByDate(data.date);
    if (existing) throw new ConflictError('この日付のデータは既に存在します');
    return ExampleRepository.create(data);
  },

  async getById(id: string) {
    const record = await ExampleRepository.findById(id);
    if (!record) throw new NotFoundError('データが見つかりません');
    return record;
  },
};
```

#### openapi.ts — OpenAPI用Zodスキーマ

```typescript
import { z } from '@hono/zod-openapi';

export const CreateExampleRequestSchema = z
  .object({
    date: z.string().date().openapi({ description: '日付 (YYYY-MM-DD)', example: '2024-01-15' }),
    field1: z.boolean().default(false).openapi({ description: 'フィールド1' }),
  })
  .openapi('CreateExampleRequest');

export const ExampleResponseSchema = z
  .object({
    id: z.uuid().openapi({ description: 'ID' }),
    date: z.string().openapi({ description: '日付' }),
    field1: z.boolean(),
    createdAt: z.string().openapi({ description: '作成日時' }),
    updatedAt: z.string().openapi({ description: '更新日時' }),
  })
  .openapi('ExampleResponse');

export const ErrorResponseSchema = z
  .object({ error: z.object({ message: z.string() }) })
  .openapi('ErrorResponse');

export const IdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' }, description: 'ID' }),
});
```

#### routes.ts — ルートハンドラ

```typescript
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AppError } from '@/lib/errors.ts';
import {
  CreateExampleRequestSchema,
  ErrorResponseSchema,
  ExampleResponseSchema,
  IdParamSchema,
} from './openapi.ts';
import { ExampleService } from './service.ts';

const createExampleRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Example'],
  summary: 'データを作成',
  request: {
    body: {
      content: { 'application/json': { schema: CreateExampleRequestSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: ExampleResponseSchema } },
      description: '作成成功',
    },
    409: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: '重複エラー',
    },
  },
});

const baseApp = new OpenAPIHono();

// サブアプリ用エラーハンドラ
baseApp.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { message: err.message } }, err.statusCode as 400 | 404 | 409 | 500);
  }
  throw err; // 未知のエラーは親アプリに伝播
});

// ルート登録（メソッドチェーン必須 → RPC型推論のため）
export const exampleRoutes = baseApp
  .openapi(createExampleRoute, async (c) => {
    const data = c.req.valid('json');
    const record = await ExampleService.create(data);
    return c.json(formatResponse(record), 201);
  });
```

### 4.11 Healthエンドポイント（最小featureの例）

```typescript
// features/health/routes.ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const HealthResponseSchema = z
  .object({
    status: z.string().openapi({ example: 'ok' }),
    timestamp: z.string(),
    version: z.string(),
  })
  .openapi('HealthResponse');

const healthCheckRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Health'],
  summary: 'ヘルスチェック',
  responses: {
    200: { content: { 'application/json': { schema: HealthResponseSchema } }, description: '正常' },
  },
});

export const healthRoutes = new OpenAPIHono().openapi(healthCheckRoute, (c) => {
  return c.json(
    { status: 'ok', timestamp: new Date().toISOString(), version: '0.0.0' },
    200,
  );
});
```

---

## 5. packages/web のセットアップ

### 5.1 deno.json

```json
{
  "name": "@<scope>/web",
  "version": "0.0.0",
  "nodeModulesDir": "auto",
  "imports": {
    "@vitejs/plugin-react": "npm:@vitejs/plugin-react@^4.7.0",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1.18",
    "vite": "npm:vite@^7.3.1",
    "react": "npm:react@^19.2.4",
    "react/": "npm:/react@^19.2.4/",
    "@types/react": "npm:@types/react@^19.2",
    "react-dom": "npm:react-dom@^19.2.4",
    "react-dom/": "npm:/react-dom@^19.2.4/",
    "react-error-boundary": "npm:react-error-boundary@^6.1",
    "react-router-dom": "npm:react-router-dom@^7.13.0",
    "@tanstack/react-query": "npm:@tanstack/react-query@^5.90.20",
    "@tanstack/react-query-devtools": "npm:@tanstack/react-query-devtools@^5.91.2",
    "react-hook-form": "npm:react-hook-form@^7.71.1",
    "@hookform/resolvers": "npm:@hookform/resolvers@^3.10.0",
    "zustand": "npm:zustand@^5.0.10",
    "hono": "npm:hono@^4.11.6",
    "clsx": "npm:clsx@^2.1.1",
    "dayjs": "npm:dayjs@^1.11.19",
    "tailwindcss": "npm:tailwindcss@^4.1.18",
    "msw": "npm:msw@^2.12.8",
    "@testing-library/react": "npm:@testing-library/react@^16.3.2",
    "jsdom": "npm:jsdom@^28.0.0",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run -A npm:vite",
    "build": "deno run -A npm:vite build",
    "preview": "deno run -A npm:vite preview",
    "test": "deno test --allow-net --allow-env --allow-read --allow-write src/",
    "check": "deno check src/**/*.ts src/**/*.tsx"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

**ポイント:**

- `"nodeModulesDir": "auto"` —
  Vite/TailwindがNode.jsモジュール解決を必要とするため、ワークスペースルートで有効化
- Viteは `deno run -A npm:vite` で直接実行（グローバルインストール不要）
- `compilerOptions.lib` に `dom` を追加（ブラウザAPI用）
- `"jsxImportSource": "react"` — `jsx: "react-jsx"` だけではDenoが `JSX.IntrinsicElements`
  等の型を解決できないため必須。`react/jsx-runtime` の型定義を参照するために必要
- `"@types/react"` — React 19 は型定義を同梱していないため必須。これがないと `JSX.IntrinsicElements`
  が見つからずJSXの型チェックが全て失敗する
- `"react/": "npm:/react@^19.2/"` — サブパスマッピング。`jsxImportSource` が内部で
  `react/jsx-runtime` を解決する際に必要（`react-dom/` と同様のパターン）
- `@/` エイリアスは import map で解決
- pnpm版の `tsconfig.json` の `references` は不要（ワークスペースで自動解決）

### 5.2 vite.config.ts

```typescript
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname!, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**変更点:**

- `__dirname` → `import.meta.dirname`（Deno/ESModules標準）
- Tailwind CSS v4 は Vite プラグインとして統合（postcss.config 不要）
- `/api` プロキシで CORS なしにバックエンドと通信

### 5.3 ディレクトリ構造（Bulletproof React ベース）

```
packages/web/src/
├── main.tsx                  # エントリーポイント（AppProvider を呼び出すだけ）
├── vite-env.d.ts             # 環境変数の型定義
├── app/                      # アプリケーション層（ルーティング・プロバイダー）
│   ├── provider.tsx          # 全プロバイダーを統合（QueryClient + Router）
│   ├── router.tsx            # createBrowserRouter によるルート定義
│   └── routes/               # ページコンポーネント（featureを合成する層）
│       ├── home.tsx          # ホームページ
│       ├── not-found.tsx     # 404ページ
│       └── example/
│           └── page.tsx      # Example CRUD デモページ（全APIエンドポイント使用）
├── components/
│   ├── ui/                   # 汎用UIコンポーネント（Button, Dialog等）
│   │   ├── error-boundary.tsx # ErrorBoundary + フォールバックUI
│   │   └── index.ts
│   ├── layout/               # レイアウトコンポーネント（Header, Footer等）
│   │   └── index.ts
│   └── forms/                # 汎用フォームコンポーネント
│       └── index.ts
├── features/                 # ドメインロジック層（API・コンポーネント・型）
│   └── <feature-name>/
│       ├── api/              # TanStack Query hooks (queries.ts, mutations.ts, types.ts)
│       │   ├── index.ts
│       │   ├── queries.ts
│       │   ├── mutations.ts
│       │   ├── types.ts
│       │   └── __tests__/
│       ├── components/       # feature固有UIコンポーネント
│       ├── constants/        # feature固有定数
│       ├── utils/            # feature固有ユーティリティ
│       ├── index.ts          # 公開API
│       └── type.ts           # feature固有ローカル型
├── hooks/                    # アプリ全体共有カスタムフック
│   └── index.ts
├── lib/
│   ├── api.ts                # Hono RPCクライアント（型安全API通信）
│   ├── query-client.ts       # TanStack Query クライアント設定
│   └── index.ts
├── stores/                   # Zustandストア（クライアント状態）
│   └── index.ts
├── styles/
│   └── app.css               # Tailwind + カスタムテーマ
├── test/
│   ├── setup.ts              # テストセットアップ
│   ├── utils.tsx             # テストユーティリティ
│   └── mocks/
│       ├── server.ts         # MSWサーバー
│       └── handlers.ts       # デフォルトハンドラ
└── types/
    └── index.ts              # グローバル型定義
```

**設計方針（Bulletproof React）:**

- **ページは `app/routes/` に配置**し、`features/` の中にはページを置かない
- ページは複数のfeatureを「合成」するレイヤーであり、feature自体は再利用可能なドメインモジュール
- インポート方向は一方向: `shared → features → app/routes`（featuresはappを知らない）
- `providers/` は廃止し `app/provider.tsx` に統合（単一のプロバイダーツリー）
- `BrowserRouter` → `createBrowserRouter`（Data Router API対応）

### 5.4 エントリーポイント（src/main.tsx）

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@/app/provider.tsx';
import './styles/app.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
);
```

**ポイント:** `main.tsx` は `AppProvider` を呼ぶだけ。プロバイダーの追加は `app/provider.tsx`
で行う。

### 5.5 app/provider.tsx

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/query-client.ts';
import { RouterProvider } from './router.tsx';

const queryClient = createQueryClient();

export function AppProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**ポイント:** プロバイダーが増えた場合（認証、テーマ等）はここでネストする。

### 5.6 app/router.tsx

```tsx
import { createBrowserRouter, RouterProvider as RRProvider } from 'react-router-dom';
import { DefaultErrorFallback } from '@/components/ui/error-boundary.tsx';
import { HomePage } from './routes/home.tsx';
import { ExamplePage } from './routes/example/page.tsx';
import { NotFoundPage } from './routes/not-found.tsx';

const router = createBrowserRouter([
  {
    errorElement: <DefaultErrorFallback error={null} />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/example', element: <ExamplePage /> },
      // ルート追加はここに
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function RouterProvider() {
  return <RRProvider router={router} />;
}
```

**ポイント:**

- `createBrowserRouter` はReact Router v7のData Router APIで、loaderやactionにも対応
- ルート全体を `errorElement` でラップ（Bulletproof
  Reactパターン）。ルート内で未キャッチの例外が発生した場合にフォールバックUIを表示
- `path: '*'` でキャッチオールルートを定義し、404ページを表示
- ページコンポーネントは `app/routes/` から直接インポート

### 5.7 エラーハンドリング（react-error-boundary）

`react-error-boundary`（bvaughn作、React コアチーム元メンバー）をデファクトスタンダードとして採用。
Bulletproof React でも同ライブラリを使用。React 19 明示サポート済み（peerDep: `^18 || ^19`）。

#### components/ui/error-boundary.tsx

```tsx
export { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-red-600'>Something went wrong</h1>
        <p className='mt-2 text-gray-600'>{error.message}</p>
        <button type='button' onClick={resetErrorBoundary}>Try again</button>
        <button type='button' onClick={() => globalThis.location.assign('/')}>Go to Home</button>
      </div>
    </div>
  );
}
```

#### app/provider.tsx での使用

```tsx
import { ErrorBoundary, ErrorFallback } from '@/components/ui/error-boundary.tsx';

export function AppProvider() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('App ErrorBoundary:', error, info.componentStack);
        // プロダクションでは Sentry 等に送信
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**ポイント:**

- `react-error-boundary` が提供する主要API:
  - `ErrorBoundary` — `FallbackComponent`, `onError`, `onReset`, `resetKeys` をサポート
  - `useErrorBoundary()` — async/イベントハンドラのエラーを `showBoundary(error)` でキャッチ
- エラーバウンダリは**複数箇所に配置**（Bulletproof React推奨）:
  - `app/provider.tsx` — アプリ全体のフォールバック
  - `app/router.tsx` — `errorElement` でルートレベルのエラー
  - 各feature内 — 個別のfeatureが壊れても他に影響しない
- 手書きクラスコンポーネントは不要（リセット機能・hook・HOCが全て組み込み済み）

### 5.8 型安全APIクライアント（src/lib/api.ts）

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@<scope>/api';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

export const api = hc<AppType>(API_BASE_URL);

export type { AppType };
export type Client = typeof api;
```

**重要:** `hc<AppType>()` により、バックエンドのルート定義から完全な型推論が得られる。pnpm版では
`@<scope>/api/src/app` からインポートしていたが、Deno版ではワークスペースの `exports`
で解決されるため `@<scope>/api` から直接インポート可能。

### 5.9 環境変数型定義（src/vite-env.d.ts）

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 5.10 CSS + Tailwindテーマ（src/styles/app.css）

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Noto Sans JP', sans-serif;
  --color-brand-primary: #3a7414;
  /* カスタムテーマトークンをここに追加 */
}
```

### 5.11 フロントエンド Feature パターン

#### Query Key Factory パターン

```typescript
// features/<name>/api/queries.ts
export const exampleKeys = {
  all: ['example'] as const,
  byId: (id: string) => [...exampleKeys.all, 'id', id] as const,
  byDate: (date: string) => [...exampleKeys.all, 'date', date] as const,
};
```

#### Query Hook パターン

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useExampleById = (id: string) => {
  return useQuery({
    queryKey: exampleKeys.byId(id),
    queryFn: async () => {
      const response = await api.api.example[':id'].$get({ param: { id } });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || 'データの取得に失敗しました');
      }
      return response.json();
    },
    enabled: !!id,
  });
};
```

#### Mutation Hook パターン

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useCreateExample = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExampleRequest) => {
      const response = await api.api.example.$post({ json: data });
      if (!response.ok) {
        const errorData = (await response.json()) as { error: { message: string } };
        throw new Error(errorData.error?.message || '作成に失敗しました');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
};
```

#### Hono Client 型推論パターン

```typescript
// features/<name>/api/types.ts
import type { InferRequestType, InferResponseType } from 'hono/client';
import type { api } from '@/lib/api.ts';

type ExampleApi = (typeof api.api)['example'];

export type CreateExampleRequest = InferRequestType<ExampleApi['$post']>['json'];
export type ExampleResponse = InferResponseType<ExampleApi[':id']['$get'], 200>;
```

### 5.12 index.html

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><Project Name></title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 6. Lint / Format 設定

### 6.1 Deno組み込みツール（Biome不要）

Denoは `deno lint` と `deno fmt` を組み込みで提供する。設定はルートの `deno.json` に統合。

```json
{
  "fmt": {
    "semiColons": true,
    "singleQuote": true,
    "indentWidth": 2,
    "lineWidth": 100
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

**pnpm版 Biome との対応:**

| Biome設定                      | Deno設定                                |
| ------------------------------ | --------------------------------------- |
| `"quoteStyle": "single"`       | `"singleQuote": true`                   |
| `"semicolons": "always"`       | `"semiColons": true`                    |
| `"indentWidth": 2`             | `"indentWidth": 2`                      |
| `"lineWidth": 100`             | `"lineWidth": 100`                      |
| `"trailingCommas": "es5"`      | デフォルト（Denoのデフォルトが同等）    |
| `"noUnusedImports": "error"`   | `deno lint` recommended に含まれる      |
| `"noUnusedVariables": "error"` | `compilerOptions.noUnusedLocals` で対応 |
| `"noExplicitAny": "warn"`      | `deno lint` recommended に含まれる      |

**設計判断:**

- **Biomeを使わない** — Deno組み込みツールで同等の機能
- **設定ファイルが不要** — `deno.json` に統合
- `deno fmt` は dprint エンジンベース（Biome同様に高速）
- `deno lint` は deno_lint（Rustベース、推奨ルール多数）

### 6.2 実行コマンド

```bash
# リント実行
deno lint

# フォーマット実行
deno fmt

# フォーマットチェック（CIで使用）
deno fmt --check
```

---

## 7. テスト基盤

### 7.1 バックエンドテスト（packages/api）

#### テストセットアップ（src/test/setup.ts）

```typescript
import { afterAll, afterEach, beforeAll, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { type Database, setDb } from '@/db/index.ts';

let pgliteClient: { close(): Promise<void> } | null = null;
let testDb: Database | null = null;

async function initTestDb(): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('@/db/schema.ts');

  const client = new PGlite();
  pgliteClient = client;
  // deno-lint-ignore no-explicit-any
  const db = drizzle(client as any, { schema }) as unknown as Database;

  const { pushSchema } = await import('drizzle-kit/api');
  // deno-lint-ignore no-explicit-any
  const { apply } = await pushSchema(schema, db as any);
  await apply();

  setDb(db);
  testDb = db;
  return db;
}

async function cleanupTables() {
  if (!testDb) return;
  const schema = await import('@/db/schema.ts');
  for (const table of Object.values(schema)) {
    await testDb.delete(table);
  }
}

async function closePglite() {
  if (pgliteClient) await pgliteClient.close();
  pgliteClient = null;
  testDb = null;
}

/** describe直下で呼ぶだけでDB初期化・テーブル掃除・PGLite終了を自動登録 */
export function useTestDb() {
  beforeAll(async () => {
    await initTestDb();
  });
  afterEach(async () => {
    await cleanupTables();
  });
  afterAll(async () => {
    await closePglite();
  });
}

export { describe, expect, it };
```

**Vitest版からの変更点:**

- `vitest` の `vi.mock` → `setDb()` による ESM live binding でのDB差し替え
- `@std/testing/bdd` で `describe/it` パターンを維持、`@std/expect` でJest互換のアサーション
- `useTestDb()` を `describe` 直下で呼ぶだけで `beforeAll`（PGLite初期化 + `setDb`）/
  `afterEach`（テーブル掃除）/ `afterAll`（PGLite終了）を自動登録
- 本番コード（repository.ts等）は一切変更不要。通常のオブジェクトリテラル + ESMインポートのまま

#### テスト3層パターン

| ファイル             | テスト対象           | 特徴                                           |
| -------------------- | -------------------- | ---------------------------------------------- |
| `repository.test.ts` | データアクセス層     | DB CRUD を直接テスト                           |
| `service.test.ts`    | ビジネスロジック層   | エラー投出・集計ロジックをテスト               |
| `routes.test.ts`     | HTTPハンドラ（統合） | `app.request()` でHTTPなしにフルサイクルテスト |

#### Hono統合テストパターン

```typescript
import { describe, expect, it, useTestDb } from '@/test/setup.ts';
import { OpenAPIHono } from '@hono/zod-openapi';
import { exampleRoutes } from '../routes.ts';

describe('Example Routes', () => {
  useTestDb();

  const app = new OpenAPIHono().route('/api/example', exampleRoutes);

  it('POST /api/example — 201: 作成できる', async () => {
    const res = await app.request('/api/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2024-01-15', field1: true, field2: 'test' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });
});
```

**ポイント:**

- `useTestDb()` を `describe` 直下で呼ぶだけでDB初期化・掃除・終了が自動化される
- `new OpenAPIHono().route()` でテスト対象のfeature routesだけをマウント
- `app.request()` でHTTPサーバーを起動せずにリクエスト/レスポンスのフルサイクルをテスト可能

### 7.2 フロントエンドテスト（packages/web）

#### test/setup.ts — MSW サーバー起動

```typescript
import { afterAll, afterEach, beforeAll } from '@std/testing/bdd';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers.ts';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
```

#### test/mocks/server.ts

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers.ts';

export const server = setupServer(...handlers);
```

#### test/mocks/handlers.ts

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // デフォルトで全API呼び出しを404にする（テストごとにオーバーライド）
  http.all('/api/*', () => {
    return HttpResponse.json({ error: { message: 'Not mocked' } }, { status: 404 });
  }),
];
```

#### test/utils.tsx — テスト用ラッパー

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

---

## 8. フロントエンド←→バックエンド型安全RPC接続

このアーキテクチャの核心部分。Hono の RPC 機能により、バックエンドのルート定義からフロントエンドの
API 呼び出しまで **エンドツーエンドの型安全** を実現する。

### 8.1 型の流れ

```
[Backend]                              [Frontend]
routes.ts                              api.ts
  ↓ createRoute() + .openapi()           ↓ hc<AppType>()
  ↓ メソッドチェーン                       ↓
app.ts                                 api.example.$get()
  ↓ const routes = app.route(...)        → リクエスト型自動推論
  ↓ export type AppType = typeof routes  → レスポンス型自動推論
  ↓
index.ts
  ↓ export type { AppType }
  ↓
deno.json workspace
  → packages/web が @<scope>/api の型を自動解決
```

### 8.2 必要な設定（pnpm版との比較）

| 設定項目             | pnpm版                               | Deno版                               |
| -------------------- | ------------------------------------ | ------------------------------------ |
| API型公開            | `tsconfig.json` の `composite: true` | `deno.json` の `exports`             |
| Web→API参照          | `tsconfig.json` の `references`      | ワークスペース自動解決               |
| パッケージ参照       | `package.json` の `workspace:*`      | `deno.json` のワークスペースメンバー |
| ルート型エクスポート | 同じ（`typeof routes`）              | 同じ（`typeof routes`）              |
| RPCクライアント      | `hc<AppType>(url)`                   | `hc<AppType>(url)`                   |

**Deno版で簡素化されたもの:**

1. `composite: true` 不要
2. `references` 不要
3. `workspace:*` 不要
4. ワークスペースメンバー間は `name` で自動解決

### 8.3 制約

- ルートは **必ずメソッドチェーン** で登録する（`app.route().route()...`）。個別に `app.route()`
  を呼ぶと型推論が途切れる。
- `AppType` は `routes` 変数の型（`app` の型ではない）。

---

## 9. Feature-Based Architecture ルール

### 9.1 基本原則

| 原則               | 説明                                                              |
| ------------------ | ----------------------------------------------------------------- |
| **Feature独立**    | 各featureは自己完結し、他featureへの直接依存を持たない            |
| **公開API**        | `index.ts` でエクスポートしたものだけが外部から利用可能           |
| **依存方向**       | `app/routes` → `features` → `components` → `shared`（逆方向禁止） |
| **コロケーション** | テスト・型・定数はfeature内に配置                                 |

### 9.2 インポートルール

```
OK:
  features/a/components/X.tsx → features/a/api/queries.ts  (同一feature内)
  app/routes/home.tsx → features/a/index.ts                (公開API経由)
  features/a/service.ts → @<scope>/shared                  (shared参照)

NG:
  features/a/X.tsx → features/b/components/Y.tsx           (feature間直接参照)
  features/a/X.tsx → features/b/repository.ts              (内部実装への参照)
  components/ui/Button.tsx → features/a/api/queries.ts     (逆方向参照)
```

### 9.3 バックエンド Feature 構成

```
features/<name>/
├── index.ts              # 公開: routes, schema のみ
├── schema.ts             # Drizzleテーブル定義 + 型推論
├── repository.ts         # DB操作（Drizzle query builder）
├── service.ts            # ビジネスロジック（Repository呼出 + エラー判定）
├── routes.ts             # HTTPハンドラ（OpenAPIHono）
├── openapi.ts    # OpenAPI用Zodスキーマ
└── __tests__/
    ├── repository.test.ts
    ├── service.test.ts
    └── routes.test.ts
```

### 9.4 フロントエンド Feature 構成

```
features/<name>/
├── index.ts              # 公開: コンポーネント + hooks
├── api/
│   ├── index.ts
│   ├── queries.ts        # useQuery hooks + queryKey factory
│   ├── mutations.ts      # useMutation hooks
│   ├── types.ts          # Hono InferRequestType / InferResponseType
│   └── __tests__/
├── components/
│   └── <Component>.tsx
├── constants/
│   └── <Name>Config.ts
├── utils/
│   └── <utility>.ts
├── type.ts               # feature内ローカル型
└── index.ts
```

---

## 10. 命名規約・コード規約

### 10.1 ディレクトリ・ファイル名

| 対象           | 規約                       | 例                                 |
| -------------- | -------------------------- | ---------------------------------- |
| パッケージ     | kebab-case                 | `packages/web`, `packages/api`     |
| Feature        | kebab-case                 | `user-profile`, `task-board`       |
| コンポーネント | kebab-case                 | `task-card.tsx`, `button.tsx`      |
| フック         | kebab-case + use prefix    | `use-auth.ts`, `use-task-board.ts` |
| スキーマ       | kebab-case                 | `task-board.ts`, `user.ts`         |
| 定数           | kebab-case                 | `task-config.ts`                   |
| テスト         | `__tests__/<name>.test.ts` | `__tests__/service.test.ts`        |

### 10.2 コード規約

| 項目                   | 規約                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| **モジュール**         | ESModules (`import`/`export`)                                         |
| **インポートパス**     | `.ts` / `.tsx` 拡張子必須                                             |
| **Node API**           | `node:` プレフィックス必須（例: `import fs from 'node:fs'`）          |
| **環境変数**           | `Deno.env.get('X')`（`process.env` ではない）                         |
| **クォート**           | シングルクォート                                                      |
| **セミコロン**         | あり                                                                  |
| **インデント**         | スペース 2                                                            |
| **行幅**               | 100文字                                                               |
| **末尾カンマ**         | ES5                                                                   |
| **Service/Repository** | オブジェクトリテラル（classは使わない）                               |
| **エラー**             | カスタム AppError サブクラスを throw                                  |
| **DB列名**             | snake_case（Drizzle定義）                                             |
| **TS プロパティ**      | camelCase（Drizzle推論）                                              |
| **パスエイリアス**     | `@/` → `./src/`（import map で解決）                                  |
| **状態管理**           | サーバー状態=TanStack Query, UI状態=Zustand, フォーム=react-hook-form |

### 10.3 pnpm版からの規約変更まとめ

| 項目           | pnpm版                              | Deno版                                        |
| -------------- | ----------------------------------- | --------------------------------------------- |
| インポートパス | 拡張子なし                          | `.ts` / `.tsx` 必須                           |
| Node API       | `import fs from 'fs'`               | `import fs from 'node:fs'`                    |
| 環境変数       | `process.env.X`                     | `Deno.env.get('X')`                           |
| サーバー起動   | `serve({ fetch, port })`            | `Deno.serve({ port }, fetch)`                 |
| テスト記述     | `import { describe } from 'vitest'` | `import { describe } from '@std/testing/bdd'` |
| アサーション   | `import { expect } from 'vitest'`   | `import { expect } from '@std/expect'`        |
| モック         | `vi.mock()` / `vi.fn()`             | DI パターン / `@std/testing/mock`             |
| 環境識別       | `NODE_ENV`                          | `DENO_ENV`                                    |

### 10.4 エクスポートパターン

```typescript
// バレルエクスポート（index.ts）
export { exampleRoutes } from './routes.ts';
export { examples } from './schema.ts';

// 内部モジュールは index.ts に含めない → 外部からアクセス不可
// repository.ts, service.ts は非公開
```

---

## セットアップ手順チェックリスト

新プロジェクトを作成する際の実行順序：

### Phase 1: 基盤

- [ ] `mkdir <project> && cd <project> && git init`
- [ ] ルート `deno.json` 作成（workspace + imports + fmt + lint + compilerOptions）
- [ ] `.gitignore` 作成
- [ ] `.vscode/settings.json` 作成（Deno拡張有効化）
- [ ] `.env.example` 作成
- [ ] `compose.yml` 作成
- [ ] `deno install`

### Phase 2: shared パッケージ

- [ ] `packages/shared/deno.json` 作成
- [ ] `packages/shared/src/index.ts` 作成（バレル）
- [ ] `packages/shared/src/constants/` 作成
- [ ] `packages/shared/src/schemas/` 作成
- [ ] `packages/shared/src/types/` 作成
- [ ] サンプルスキーマ・定数を1つ作成

### Phase 3: api パッケージ

- [ ] `packages/api/deno.json` 作成
- [ ] `packages/api/drizzle.config.ts` 作成
- [ ] `packages/api/src/index.ts` 作成（Deno.serve エントリーポイント）
- [ ] `packages/api/src/app.ts` 作成（Honoアプリ + AppType）
- [ ] `packages/api/src/db/index.ts` 作成（Drizzle DB接続 + `setDb()` テスト用DI）
- [ ] `packages/api/src/db/schema.ts` 作成（スキーマ集約）
- [ ] `packages/api/src/middleware/` 作成（LogTape logger, error-handler）
- [ ] `packages/api/src/lib/errors.ts` 作成
- [ ] `packages/api/src/features/health/` 作成（最小feature）
- [ ] `packages/api/src/test/setup.ts` 作成（PGLite + @std/testing）
- [ ] サンプルfeatureを1つ作成（schema → repository → service → routes → tests）

### Phase 4: web パッケージ

- [ ] `packages/web/deno.json` 作成
- [ ] `packages/web/vite.config.ts` 作成
- [ ] `packages/web/index.html` 作成
- [ ] `packages/web/src/main.tsx` 作成（AppProvider を呼ぶだけ）
- [ ] `packages/web/src/vite-env.d.ts` 作成
- [ ] `packages/web/src/styles/app.css` 作成
- [ ] `packages/web/src/app/provider.tsx` 作成（全プロバイダー統合）
- [ ] `packages/web/src/app/router.tsx` 作成（createBrowserRouter）
- [ ] `packages/web/src/app/routes/` 作成（ページコンポーネント）
- [ ] `packages/web/src/lib/api.ts` 作成（RPC クライアント）
- [ ] `packages/web/src/lib/query-client.ts` 作成
- [ ] `packages/web/src/test/` セットアップ（setup.ts, mocks/, utils.tsx）
- [ ] ディレクトリ構造作成（features/, components/, hooks/, stores/, types/）

### Phase 5: 検証

- [ ] `deno install` — 依存解決確認
- [ ] `deno lint` — エラーなし
- [ ] `deno fmt --check` — フォーマット確認
- [ ] `deno task --filter '@app/api' test` — APIテスト通過
- [ ] `deno task --filter '@app/web' test` — Webテスト通過
- [ ] `deno task dev` — API + Web 同時起動
- [ ] `deno run -A npm:vite build`（web）— ビルド成功
- [ ] API → Web の型安全RPC接続確認

---

> **このDeno版計画書は pnpm/Node.js版 `PNPM_BOILERPLATE_BLUEPRINT.md`
> をベースに、Deno向けに全面改訂したものです。** **`<project-name>`, `<scope>`, `<db_name>`
> はプロジェクトに合わせて置換してください。**
