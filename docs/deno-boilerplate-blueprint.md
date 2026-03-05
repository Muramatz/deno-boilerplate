# ボイラープレート実装計画書（Deno版）

> このドキュメントはプロジェクトの技術構成を Deno ランタイムで再現するための実装計画書です。
> ドメイン知識・インフラ・外部連携は含みません。純粋な技術ボイラープレートのみを対象とします。

---

## 目次

1. [技術スタック一覧](#1-技術スタック一覧)
2. [モノレポ基盤セットアップ](#2-モノレポ基盤セットアップ)
3. [API-First スキーマ共有アーキテクチャ](#3-api-first-スキーマ共有アーキテクチャ)
4. [packages/api のセットアップ](#4-packagesapi-のセットアップ)
5. [packages/web のセットアップ](#5-packagesweb-のセットアップ)
6. [Lint / Format 設定](#6-lint--format-設定)
7. [テスト基盤](#7-テスト基盤)
8. [フロントエンド←→バックエンド型安全RPC接続](#8-フロントエンドバックエンド型安全rpc接続)
9. [Feature-Based Architecture ルール](#9-feature-based-architecture-ルール)
10. [命名規約・コード規約](#10-命名規約コード規約)
11. [デプロイ（Deno Deploy）](#11-デプロイdeno-deploy)

---

## 1. 技術スタック一覧

| カテゴリ                      | 技術                                  | バージョン   | 用途                                                                                                                        |
| ----------------------------- | ------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **言語**                      | TypeScript                            | Deno組み込み | 全パッケージ共通、strict mode                                                                                               |
| **ランタイム/パッケージ管理** | Deno                                  | >=2.x        | ランタイム + ワークスペース + パッケージ管理                                                                                |
| **フロントエンド**            | React                                 | ^19.2        | UI ライブラリ                                                                                                               |
| **ビルド**                    | Vite                                  | ^7.3         | フロントエンドバンドラー + 開発サーバー                                                                                     |
| **CSS**                       | Tailwind CSS                          | ^4.1         | ユーティリティファーストCSS（Viteプラグイン統合）                                                                           |
| **状態管理**                  | Zustand                               | ^5.0         | クライアント側UI状態                                                                                                        |
| **サーバー状態**              | TanStack Query                        | ^5.90        | サーバーデータのキャッシュ・同期                                                                                            |
| **フォーム**                  | react-hook-form + @hookform/resolvers | ^7.71 / ^5.2 | フォームバリデーション（Zodと統合）                                                                                         |
| **ルーティング**              | react-router-dom                      | ^7.13        | SPA ルーティング                                                                                                            |
| **バックエンド**              | Hono                                  | ^4.11        | 軽量 Web フレームワーク                                                                                                     |
| **OpenAPI**                   | @hono/zod-openapi                     | ^1.2         | Zodスキーマから自動ドキュメント生成                                                                                         |
| **ORM**                       | Prisma ORM                            | ^7.0         | 型安全なDB操作（Pure TypeScript, driver adapter必須）                                                                       |
| **DBドライバ**                | @prisma/adapter-pg                    | ^7.0         | PostgreSQL TCP接続（ローカル開発 + Prisma Postgres）                                                                        |
| **バリデーション**            | Zod                                   | ^4.0         | フロント・バック共有スキーマ（※@hono/zod-openapi v1.xはZod v4必須。v4では`.partial()`でも`.default()`が保持される点に注意） |
| **ロギング**                  | @logtape/logtape                      | ^0.10        | 構造化ログ（マルチランタイム対応）                                                                                          |
| **Lint/Format**               | deno lint / deno fmt                  | Deno組み込み | Linter + Formatter                                                                                                          |
| **テスト**                    | deno test + @std/testing              | Deno組み込み | ユニット・統合テスト                                                                                                        |
| **テストDB**                  | PostgreSQL (Docker)                   | 18-alpine    | テスト用DB（`app_test`、compose.yml initdbで自動作成）                                                                      |
| **UIテスト**                  | @testing-library/react                | ^16.3        | Reactコンポーネントテスト                                                                                                   |
| **モック**                    | MSW (Mock Service Worker)             | ^2.12        | API モック（フロントエンドテスト用）                                                                                        |
| **日付**                      | date-fns                              | ^4.1         | バックエンド日付操作                                                                                                        |
| **日付(FE)**                  | dayjs                                 | ^1.11        | フロントエンド日付操作                                                                                                      |
| **クラス結合**                | clsx                                  | ^2.1         | className の条件結合                                                                                                        |
| **環境変数**                  | @std/dotenv                           | Deno標準     | .envファイル読み込み                                                                                                        |

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
    ├── api/                  # バックエンド（Hono on Deno）— スキーマのSingle Source of Truth
    └── web/                  # フロントエンド（React + Vite on Deno）
```

### 2.2 ルート deno.json

```json
{
  "nodeModulesDir": "auto",
  "workspace": ["./packages/api", "./packages/web"],
  "imports": {
    "zod": "npm:zod@^4.0",
    "@std/assert": "jsr:@std/assert@^1",
    "@std/testing": "jsr:@std/testing@^1",
    "@std/expect": "jsr:@std/expect@^1",
    "@std/dotenv": "jsr:@std/dotenv@^0.225"
  },
  "tasks": {
    "dev:api": "deno task --filter '@app/api' dev",
    "dev:web": "deno task --filter '@app/web' dev",
    "dev": "deno task dev:api & deno task dev:web",
    "test": "deno task --filter '@app/api' test",
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
  "exclude": ["node_modules", "dist", "build", ".claude"]
}
```

**ポイント:**

- pnpm版の4ファイル（`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `biome.json`）が
  **`deno.json` 1つに統合**
- `workspace` でモノレポメンバーを定義（`shared` パッケージは廃止、API-First 設計を採用）
- ルートの `imports` は全ワークスペースメンバーに継承される。**Zod v4
  を使用**（`@hono/zod-openapi@1.x` が Zod v4 を peerDep として要求）
- `fmt` 設定はBiome版と同じルール（シングルクォート、セミコロンあり、インデント2、行幅100）
- **重要:** `deno task --recursive` / `deno task -r`
  はルート自身のタスクも実行するため、ルートに同名タスクがあると無限ループになる。`--filter`
  でパッケージを明示指定すること
- **重要:** `deno test packages/`
  はワークスペースメンバーごとにテストを重複実行する。`deno task --filter '<pkg>' test`
  で各メンバーのテストタスクを個別実行すること
- **重要:** `nodeModulesDir` はワークスペースルートでのみ指定可能（メンバーの deno.json
  では無視される）。Vite/Tailwind のために `"nodeModulesDir": "auto"` をルートに配置
- **重要:** `.claude` ディレクトリを `exclude` に追加して `deno fmt` / `deno lint` の対象外にする

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

# Prisma generated client
packages/api/generated/prisma/

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
# Local development (Docker PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/<project_db_name>
# Production (Neon — URL に neon.tech を含むと自動で serverless HTTP driver を使用)
# DATABASE_URL=postgresql://user:pass@ep-xxx-yyy-123.us-east-2.aws.neon.tech/dbname?sslmode=require

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

**ポイント:**

- `NODE_ENV` → `DENO_ENV` に変更
- `DATABASE_URL` に `neon.tech` を含む場合、API は自動で Neon HTTP ドライバを使用
- ローカル開発では Docker PostgreSQL の接続文字列をそのまま使用

---

## 3. API-First スキーマ共有アーキテクチャ

### 3.1 設計思想

従来の `packages/shared` パッケージは廃止し、**API が Zod スキーマの Single Source of Truth** となる
API-First 設計を採用する。各 feature 内に pure Zod スキーマ（`schema.ts`）を配置し、
`@<scope>/api/schemas` サブパスエクスポート経由で Web が消費する。

```
[API — Single Source of Truth]
features/<name>/
  schema.ts     → Pure Zod スキーマ（共有バリデーション）  ← Web が import
  (DBスキーマは prisma/schema.prisma で一元管理)
  constants.ts  → ドメイン定数（as const + 型導出）        ← Web が import
  openapi.ts    → OpenAPI メタデータ付き Zod スキーマ（API ドキュメント用）

[Web — 消費側]
import { createExampleSchema } from '@<scope>/api/schemas';
→ react-hook-form + zodResolver でフォームバリデーション
```

### 3.2 shared パッケージを廃止した理由

| 観点                       | shared パッケージ                              | API-First                                      |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| **スキーマ定義場所**       | shared に定義 → API, Web 両方が import         | API feature 内に定義 → Web がサブパスで import |
| **同期コスト**             | shared 変更時に API, Web 両方の整合性を確認    | API が唯一の定義元、Web は常に最新を参照       |
| **依存方向**               | shared ← API, shared ← Web（双方向依存リスク） | API → Web（一方向のみ）                        |
| **feature コロケーション** | スキーマが feature から分離                    | スキーマが feature 内に同居                    |

### 3.3 スキーマ共有の仕組み

**API 側: サブパスエクスポート**

`packages/api/deno.json`:

```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas/index.ts"
}
```

`packages/api/src/schemas/index.ts`:

```typescript
// Zodスキーマ & 型
export {
  baseExampleSchema,
  createExampleSchema,
  exampleSchema,
  updateExampleSchema,
} from '../features/example/schema.ts';
export type { CreateExample, Example, UpdateExample } from '../features/example/schema.ts';

// 定数
export { EXAMPLE_STATUS_IDS, EXAMPLE_STATUSES } from '../features/example/constants.ts';
export type { ExampleStatusId } from '../features/example/constants.ts';
```

Web 側での import:

```typescript
import { createExampleSchema } from '@<scope>/api/schemas';
```

**重要:** Vite は Deno ワークスペースのサブパスエクスポートを解決できないため、 `vite.config.ts`
に明示的な `resolve.alias` が必要（詳細はセクション 5.2 参照）。

### 3.4 Feature 内のファイル構成（3層 + 共有スキーマ）

各 feature は以下のファイルで構成される:

```
features/<name>/
├── schema.ts      # Pure Zod バリデーションスキーマ（Web 共有用）
├── constants.ts   # ドメイン定数（as const + 型導出）
├── openapi.ts     # OpenAPI メタデータ付き Zod スキーマ（API ドキュメント用）
├── repository.ts  # データアクセス層（Prisma Client CRUD）
├── service.ts     # ビジネスロジック層
├── routes.ts      # HTTP ルートハンドラ（OpenAPIHono）
├── index.ts       # 公開 API（routes のみ）
└── __tests__/
```

**openapi.ts と schema.ts の関係:**

- `schema.ts` は純粋な `zod` で定義（Web 向けエクスポート用）
- `openapi.ts` は `@hono/zod-openapi` の `z` で定義（description, example 等の OpenAPI
  メタデータ付き）
- 両者は同じフィールド構造を持つが、用途が異なる
- TypeScript がスキーマの乖離を検出する仕組み:

```text
routes.ts: c.req.valid('json')         → openapi.ts の型
routes.ts: ExampleService.create(data) → schema.ts の CreateExample 型
→ 型が一致しなければコンパイルエラー
```

### 3.5 コードパターン

#### Zod スキーマパターン（ベース → 拡張 → 部分更新）— Zod v4

```typescript
// features/<name>/schema.ts
import { z } from 'zod';

// ベーススキーマ
export const baseExampleSchema = z.object({
  field1: z.boolean().default(false),
  field2: z.string().min(1),
});

// 作成スキーマ（ベース + 追加フィールド）
export const createExampleSchema = baseExampleSchema.extend({
  date: z.iso.date(), // Zod v4: z.string().date() → z.iso.date()
});
export type CreateExample = z.infer<typeof createExampleSchema>;

// 更新スキーマ（部分更新）
// Zod v4: .partial() は .default() の値を保持する（v3 との breaking change）
export const updateExampleSchema = baseExampleSchema.partial();
export type UpdateExample = z.infer<typeof updateExampleSchema>;

// レスポンススキーマ（メタデータ付き）
export const exampleSchema = baseExampleSchema.extend({
  id: z.uuid(),
  date: z.iso.date(),
  createdAt: z.iso.datetime(), // Zod v4: z.string().datetime() → z.iso.datetime()
  updatedAt: z.iso.datetime(),
});
export type Example = z.infer<typeof exampleSchema>;
```

Zod v4 の注意点:

- `z.string().date()` → `z.iso.date()` に変更
- `z.string().datetime()` → `z.iso.datetime()` に変更
- `.partial()` が `.default()` の値を保持する（v3 では `.default()` が消えていた）
- react-hook-form には `z.input<typeof schema>` を使用（input 型は `.default()` 付きフィールドが
  optional になる）、出力型は `z.infer<typeof schema>`

#### 定数定義パターン（`as const` + 型導出）

```typescript
// features/<name>/constants.ts
export const EXAMPLE_STATUSES = [
  { id: 'active', label: '有効', order: 1 },
  { id: 'inactive', label: '無効', order: 2 },
  { id: 'archived', label: 'アーカイブ', order: 3 },
] as const;

export type ExampleStatusId = (typeof EXAMPLE_STATUSES)[number]['id'];
export const EXAMPLE_STATUS_IDS = EXAMPLE_STATUSES.map((s) => s.id);
```

**注意:** Denoではインポートパスに `.ts` 拡張子が必須。

---

## 4. packages/api のセットアップ

### 4.1 deno.json

```json
{
  "name": "@<scope>/api",
  "version": "0.0.0",
  "exports": {
    ".": "./src/index.ts",
    "./schemas": "./src/schemas/index.ts"
  },
  "imports": {
    "@hono/zod-openapi": "npm:@hono/zod-openapi@^1.2",
    "@hono/swagger-ui": "npm:@hono/swagger-ui@^0.5",
    "hono": "npm:hono@^4.11",
    "@prisma/adapter-pg": "npm:@prisma/adapter-pg@^7.0.0",
    "@prisma/client": "npm:@prisma/client@^7.0.0",
    "prisma": "npm:prisma@^7.0.0",
    "date-fns": "npm:date-fns@^4.1",
    "@logtape/logtape": "jsr:@logtape/logtape@^0.10",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env --allow-read src/index.ts",
    "check": "deno check src/**/*.ts",
    "test": "deno test --allow-net --allow-env --allow-read --allow-write --allow-sys --allow-ffi src/",
    "db:generate": "deno run -A --env=.env npm:prisma generate",
    "db:migrate": "deno run -A --env=.env npm:prisma migrate dev",
    "db:deploy": "deno run -A --env=.env npm:prisma migrate deploy",
    "db:push": "deno run -A --env=.env npm:prisma db push",
    "db:studio": "deno run -A --env=.env npm:prisma studio"
  },
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

**ポイント:**

- `exports` にサブパスを定義: `"./schemas"` で Web から Zod スキーマを import 可能にする
- `tsx watch` → `deno run --watch`（ネイティブTS実行 + ホットリロード）
- `tsc && tsc-alias` ビルド → **不要**（Denoは.tsを直接実行）
- `@/` パスエイリアスは `imports` で解決（tsc-alias不要）
- `pino` → `@logtape/logtape`（Denoネイティブ対応ロガー）
- Denoの権限モデル: `--allow-net`, `--allow-env`, `--allow-read` を明示
- テストタスクには追加で `--allow-write --allow-sys --allow-ffi` が必要（Prisma Client
  が内部で使用）
- Prisma ORM 7: Pure TypeScript（Rust エンジン不要）、`prisma-client` プロバイダ、driver adapter
  必須
- `@prisma/adapter-pg` — PostgreSQL TCP 接続用ドライバアダプタ
- `prisma.config.ts` で `DATABASE_URL` を設定（`prisma generate` 時もダミー値が必要）
- 生成クライアントは `packages/api/generated/prisma/` に出力（gitignore 対象）

### 4.2 ディレクトリ構造

```
packages/api/
├── prisma/
│   └── schema.prisma                 # Prisma スキーマ定義（Single Source of Truth）
├── prisma.config.ts                  # Prisma 7 設定（datasource URL）
├── generated/prisma/                 # Prisma 生成クライアント（gitignore対象）
└── src/
    ├── index.ts                      # エントリーポイント（Deno.serve + AppType再エクスポート）
    ├── app.ts                        # Honoアプリ定義・ルート集約・ミドルウェアチェーン
    ├── db/
    │   └── index.ts                  # Prisma Client接続 + setPrisma()（テスト用DI）
    ├── schemas/
    │   └── index.ts                  # Web向けZodスキーマ・定数の集約再エクスポート
    ├── features/
    │   └── <feature-name>/
    │       ├── index.ts              # 公開API（routesのみ公開）
    │       ├── schema.ts             # Pure Zodバリデーションスキーマ（Web共有用）
    │       ├── constants.ts          # ドメイン定数（as const + 型導出）
    │       ├── openapi.ts            # OpenAPIメタデータ付きZodスキーマ
    │       ├── repository.ts         # データアクセス層（Prisma Client CRUD）
    │       ├── service.ts            # ビジネスロジック層
    │       ├── routes.ts             # Honoルートハンドラ
    │       └── __tests__/
    │           ├── routes.test.ts    # 統合テスト
    │           ├── service.test.ts   # ビジネスロジックテスト
    │           └── repository.test.ts # データ層テスト
    ├── lib/
    │   ├── errors.ts                 # カスタムエラークラス
    │   └── __tests__/
    │       └── errors.test.ts
    ├── middleware/
    │   ├── index.ts                  # ミドルウェア再エクスポート
    │   ├── error-handler.ts          # グローバルエラーハンドラ
    │   └── logger.ts                 # LogTapeロギングミドルウェア
    └── test/
        └── setup.ts                  # テストセットアップ（PostgreSQL Docker + Prisma）
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
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';

const connectionString = Deno.env.get('DATABASE_URL') ||
  'postgresql://postgres:postgres@localhost:5432/app_db';

const adapter = new PrismaPg({ connectionString });
export let prisma = new PrismaClient({ adapter });

/** テスト用: Prismaインスタンスを差し替える（ESM live binding経由で全モジュールに反映） */
export function setPrisma(newPrisma: PrismaClient) {
  prisma = newPrisma;
}
```

**ポイント:**

- **Prisma ORM 7:** Pure TypeScript（Rust エンジン不要）。`@prisma/adapter-pg` で PostgreSQL TCP
  接続
- `export let prisma` により ESM live binding で `setPrisma()` の変更が全インポート先に即時反映
- テスト時は別の PrismaClient インスタンスを `setPrisma()`
  で注入し、本番コードを一切変更せずにテスト可能
- Prisma Postgres（本番）もローカル PostgreSQL（開発）も同じ `@prisma/adapter-pg`
  ドライバアダプタを使用

### 4.8 Prisma スキーマ（prisma/schema.prisma）

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  runtime  = "deno"
}

datasource db {
  provider = "postgresql"
}

model Example {
  id        String   @id @default(uuid()) @db.Uuid
  date      DateTime @unique @db.Date
  field1    Boolean  @default(false)
  field2    String   @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("examples")
}
```

### 4.9 Prisma設定（prisma.config.ts）

```typescript
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
```

### 4.10 Feature レイヤーパターン（各ファイルの責務）

```text
routes.ts → service.ts → repository.ts → Prisma Client (DB)
     ↓           ↓              ↓
  HTTP入出力   ビジネスロジック   データ操作
  OpenAPI検証  エラー判定        Prisma CRUD
              集計・変換         Date↔string変換

openapi.ts ← routes.ts が参照（リクエスト/レスポンスのOpenAPIスキーマ）
schema.ts  ← service.ts が参照（Pure Zodバリデーション型）
           ← Web が @<scope>/api/schemas 経由で参照
```

#### repository.ts — データアクセス層

```typescript
import { prisma } from '@/db/index.ts';
import type { Example } from '../../../generated/prisma/client.ts';

/** Prisma の Date 出力 → アプリ層で使う string (YYYY-MM-DD) に変換 */
export type ExampleRecord = Omit<Example, 'date'> & { date: string };
export type NewExampleRecord = {
  date: string;
  field1?: boolean;
  field2: string;
};

/** YYYY-MM-DD string → Date (UTC midnight) */
function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

function toRecord(row: Example): ExampleRecord {
  return { ...row, date: row.date.toISOString().slice(0, 10) };
}

export const ExampleRepository = {
  async create(data: NewExampleRecord): Promise<ExampleRecord> {
    const record = await prisma.example.create({
      data: { ...data, date: toDate(data.date) },
    });
    return toRecord(record);
  },

  async findById(id: string): Promise<ExampleRecord | null> {
    const record = await prisma.example.findUnique({ where: { id } });
    return record ? toRecord(record) : null;
  },

  async findByDate(date: string): Promise<ExampleRecord | null> {
    const record = await prisma.example.findUnique({
      where: { date: toDate(date) },
    });
    return record ? toRecord(record) : null;
  },

  async update(
    id: string,
    data: Partial<NewExampleRecord>,
  ): Promise<ExampleRecord | null> {
    try {
      const record = await prisma.example.update({ where: { id }, data });
      return toRecord(record);
    } catch (e: unknown) {
      if (
        typeof e === 'object' && e !== null && 'code' in e &&
        (e as { code: string }).code === 'P2025'
      ) {
        return null;
      }
      throw e;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.example.delete({ where: { id } });
      return true;
    } catch (e: unknown) {
      if (
        typeof e === 'object' && e !== null && 'code' in e &&
        (e as { code: string }).code === 'P2025'
      ) {
        return false;
      }
      throw e;
    }
  },
};
```

**パターン:**

- クラスではなくオブジェクトリテラル（インスタンス生成不要）
- 見つからない場合は `null` を返す（エラーは投げない）
- `@updatedAt` により Prisma が `updatedAt` を自動更新
- **`DateTime @db.Date`** は JS `Date` を返すため、repository 層で `toDate()` / `toRecord()` で
  `YYYY-MM-DD` 文字列との相互変換を行う。上位層（service, routes, web）は常に文字列で扱う
- **P2025 エラー:** Prisma が update/delete で存在しないレコードを対象にすると throw する。
  repository 層で catch して `null` / `false` を返す

#### service.ts — ビジネスロジック層

```typescript
import type { CreateExample, UpdateExample } from './schema.ts';
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

  async update(id: string, data: UpdateExample) {
    const record = await ExampleRepository.update(id, data);
    if (!record) throw new NotFoundError('データが見つかりません');
    return record;
  },

  async delete(id: string) {
    const deleted = await ExampleRepository.delete(id);
    if (!deleted) throw new NotFoundError('データが見つかりません');
  },
};
```

**ポイント:** service.ts は `./schema.ts`（feature 内の pure Zod スキーマ）から型を import する。
従来の `@<scope>/shared` からの import は不要。

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
  "exports": "./src/main.tsx",
  "imports": {
    "@vitejs/plugin-react": "npm:@vitejs/plugin-react@^5.1",
    "@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1",
    "vite": "npm:vite@^7.3",
    "react": "npm:react@^19.2",
    "react/": "npm:/react@^19.2/",
    "@types/react": "npm:@types/react@^19.2",
    "react-dom": "npm:react-dom@^19.2",
    "react-dom/": "npm:/react-dom@^19.2/",
    "react-error-boundary": "npm:react-error-boundary@^6.1",
    "react-router-dom": "npm:react-router-dom@^7.13",
    "@tanstack/react-query": "npm:@tanstack/react-query@^5.90",
    "@tanstack/react-query-devtools": "npm:@tanstack/react-query-devtools@^5.91",
    "react-hook-form": "npm:react-hook-form@^7.71",
    "@hookform/resolvers": "npm:@hookform/resolvers@^5.2",
    "zustand": "npm:zustand@^5.0",
    "hono": "npm:hono@^4.11",
    "clsx": "npm:clsx@^2.1",
    "dayjs": "npm:dayjs@^1.11",
    "tailwindcss": "npm:tailwindcss@^4.1",
    "msw": "npm:msw@^2.12",
    "@testing-library/react": "npm:@testing-library/react@^16.3",
    "jsdom": "npm:jsdom@^28.0",
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

- `nodeModulesDir` はワークスペースルートの `deno.json` で設定する（メンバーでは指定不要）
- Viteは `deno run -A npm:vite` で直接実行（グローバルインストール不要）
- `@hookform/resolvers@^5.2` — v5.x は `@hookform/resolvers/zod` でインポートする
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
      '@app/api/schemas': resolve(import.meta.dirname!, '../api/src/schemas/index.ts'),
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
- **重要:** `@app/api/schemas` の alias が必須 — Vite は Deno ワークスペースのサブパスエクスポートを
  解決できないため、明示的に `../api/src/schemas/index.ts` へのパス解決を追加する

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
- インポート方向は一方向: `@<scope>/api/schemas → features → app/routes`（featuresはappを知らない）
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

### 5.13 フォームコンポーネントパターン（react-hook-form + Zod）

API の Zod スキーマを `@<scope>/api/schemas` から import し、`zodResolver` で react-hook-form
に統合する。

#### 作成フォーム（create-form.tsx）

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExampleSchema } from '@app/api/schemas';
import type { z } from 'zod';
import { useCreateExample } from '../api/mutations.ts';

// Zod v4: z.input は default() 付きフィールドを optional にする（フォーム入力用）
type CreateExampleInput = z.input<typeof createExampleSchema>;

export function CreateForm({ onCreated }: { onCreated: (data: ExampleData) => void }) {
  const createMutation = useCreateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateExampleInput>({
    resolver: zodResolver(createExampleSchema),
    defaultValues: { date: todayString(), field1: false, field2: '' },
  });

  const field1Value = watch('field1');

  const onSubmit = (data: CreateExampleInput) => {
    createMutation.mutate(data, {
      onSuccess: (res) => {
        onCreated(res as ExampleData);
        reset({ date: todayString(), field1: false, field2: '' });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-3 rounded border p-4'>
      <div>
        <input type='date' {...register('date')} className='w-full rounded border px-3 py-1.5' />
        {errors.date && <p className='mt-1 text-sm text-red-600'>{errors.date.message}</p>}
      </div>
      <div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={field1Value ?? false}
            onChange={(e) => setValue('field1', e.target.checked)}
          />
          Field1
        </label>
      </div>
      <div>
        <input type='text' {...register('field2')} className='w-full rounded border px-3 py-1.5' />
        {errors.field2 && <p className='mt-1 text-sm text-red-600'>{errors.field2.message}</p>}
      </div>
      <button type='submit' disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

#### 更新フォーム（update-form.tsx）

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateExampleSchema } from '@app/api/schemas';
import type { z } from 'zod';
import { useUpdateExample } from '../api/mutations.ts';

type UpdateExampleInput = z.input<typeof updateExampleSchema>;

export function UpdateForm({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const updateMutation = useUpdateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateExampleInput>({
    resolver: zodResolver(updateExampleSchema),
    defaultValues: { field1: undefined, field2: undefined },
  });

  const onSubmit = (data: UpdateExampleInput) => {
    // undefined のフィールドを除去
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== ''),
    );
    updateMutation.mutate(
      { id, data: filtered },
      {
        onSuccess: () => {
          reset();
          onUpdated();
        },
      },
    );
  };

  // ...（JSXはcreate-formと同様のパターン）
}
```

**ポイント:**

- `z.input<typeof schema>` を useForm の型パラメータに使用（`z.infer` ではない）。 Zod v4 では
  `default()` 付きフィールドの input 型は optional になる
- `zodResolver(schema)` でフォームバリデーションを Zod スキーマに委譲
- checkbox は `register` ではなく `watch` + `setValue` で手動制御 （`register` は文字列ベースのため
  boolean に適さない）
- 更新フォームでは `undefined` / 空文字列のフィールドを除去してから送信（部分更新パターン）

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
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import { setPrisma } from '@/db/index.ts';

let testPrisma: PrismaClient | null = null;

function createTestPrisma(): PrismaClient {
  const connectionString = Deno.env.get('TEST_DATABASE_URL') ??
    'postgresql://postgres:postgres@localhost:5432/app_test';
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * describe 直下で呼ぶだけで DB 接続・テーブル掃除・切断を自動登録。
 *
 * 前提条件: テスト用 PostgreSQL が起動済み + スキーマ適用済み
 *   docker compose up -d
 *   deno task db:push:test
 */
export function useTestDb() {
  beforeAll(() => {
    testPrisma = createTestPrisma();
    setPrisma(testPrisma);
  });
  afterEach(async () => {
    if (!testPrisma) return;
    await testPrisma.$executeRawUnsafe(
      'TRUNCATE TABLE examples RESTART IDENTITY CASCADE',
    );
  });
  afterAll(async () => {
    if (testPrisma) await testPrisma.$disconnect();
    testPrisma = null;
  });
}

export { describe, expect, it };
```

**Vitest版からの変更点:**

- `vitest` の `vi.mock` → `setPrisma()` による ESM live binding でのDB差し替え
- `@std/testing/bdd` で `describe/it` パターンを維持、`@std/expect` でJest互換のアサーション
- `useTestDb()` を `describe` 直下で呼ぶだけで `beforeAll`（Prisma接続 + `setPrisma`）/
  `afterEach`（TRUNCATE でテーブル掃除）/ `afterAll`（Prisma切断）を自動登録
- 本番コード（repository.ts等）は一切変更不要。通常のオブジェクトリテラル + ESMインポートのまま
- **前提条件:** Docker PostgreSQL が起動済み + `prisma db push` でスキーマ適用済みであること

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

このアーキテクチャの核心部分。2つの型共有メカニズムがある:

1. **RPC 型推論** — Hono の RPC 機能により、ルート定義からフロントエンドの API 呼び出しまで
   エンドツーエンドの型安全を実現
2. **スキーマ共有** — `@<scope>/api/schemas` サブパスエクスポートで Zod スキーマを
   フロントエンドのフォームバリデーションに再利用

### 8.1 型の流れ

```text
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

[スキーマ共有（フォームバリデーション用）]
features/<name>/schema.ts              create-form.tsx
  ↓ pure Zod スキーマ                     ↓ import from '@<scope>/api/schemas'
schemas/index.ts                       zodResolver(createExampleSchema)
  ↓ サブパスエクスポート                   → react-hook-form でバリデーション
```

### 8.2 必要な設定（pnpm版との比較）

| 設定項目             | pnpm版                               | Deno版                                      |
| -------------------- | ------------------------------------ | ------------------------------------------- |
| API型公開            | `tsconfig.json` の `composite: true` | `deno.json` の `exports`                    |
| Web→API参照          | `tsconfig.json` の `references`      | ワークスペース自動解決                      |
| パッケージ参照       | `package.json` の `workspace:*`      | `deno.json` のワークスペースメンバー        |
| ルート型エクスポート | 同じ（`typeof routes`）              | 同じ（`typeof routes`）                     |
| RPCクライアント      | `hc<AppType>(url)`                   | `hc<AppType>(url)`                          |
| スキーマ共有         | `@<scope>/shared` パッケージ         | `@<scope>/api/schemas` サブパスエクスポート |
| Viteサブパス解決     | なし（Node.jsが自動解決）            | `vite.config.ts` に `resolve.alias` が必要  |

**Deno版で簡素化されたもの:**

1. `composite: true` 不要
2. `references` 不要
3. `workspace:*` 不要
4. ワークスペースメンバー間は `name` で自動解決
5. `shared` パッケージ不要（API がスキーマの Single Source of Truth）

### 8.3 制約

- ルートは **必ずメソッドチェーン** で登録する（`app.route().route()...`）。個別に `app.route()`
  を呼ぶと型推論が途切れる。
- `AppType` は `routes` 変数の型（`app` の型ではない）。
- Vite は Deno ワークスペースのサブパスエクスポートを解決できないため、`@<scope>/api/schemas`
  を使う場合は `vite.config.ts` に `resolve.alias` を追加する必要がある。

---

## 9. Feature-Based Architecture ルール

### 9.1 基本原則

| 原則               | 説明                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Feature独立**    | 各featureは自己完結し、他featureへの直接依存を持たない                                                                        |
| **公開API**        | `index.ts` でエクスポートしたものだけが外部から利用可能                                                                       |
| **依存方向**       | `app/routes` → `features` → `components`（逆方向禁止）。Web feature は `@<scope>/api/schemas` から Zod スキーマを import 可能 |
| **コロケーション** | テスト・型・定数はfeature内に配置                                                                                             |

### 9.2 インポートルール

```text
OK:
  features/a/components/X.tsx → features/a/api/queries.ts    (同一feature内)
  app/routes/home.tsx → features/a/index.ts                  (公開API経由)
  features/a/components/X.tsx → @<scope>/api/schemas         (APIスキーマ参照)
  features/a/service.ts → ./schema.ts                        (同一feature内スキーマ)

NG:
  features/a/X.tsx → features/b/components/Y.tsx             (feature間直接参照)
  features/a/X.tsx → features/b/repository.ts                (内部実装への参照)
  components/ui/Button.tsx → features/a/api/queries.ts       (逆方向参照)
```

### 9.3 バックエンド Feature 構成

```text
features/<name>/
├── index.ts              # 公開: routes のみ
├── schema.ts             # Pure Zodバリデーションスキーマ（Web共有用）
├── constants.ts          # ドメイン定数（as const + 型導出）
├── openapi.ts            # OpenAPIメタデータ付きZodスキーマ
├── repository.ts         # DB操作（Prisma Client CRUD）
├── service.ts            # ビジネスロジック（Repository呼出 + エラー判定）
├── routes.ts             # HTTPハンドラ（OpenAPIHono）
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

| 項目                   | 規約                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| **モジュール**         | ESModules (`import`/`export`)                                                   |
| **インポートパス**     | `.ts` / `.tsx` 拡張子必須                                                       |
| **Node API**           | `node:` プレフィックス必須（例: `import fs from 'node:fs'`）                    |
| **環境変数**           | `Deno.env.get('X')`（`process.env` ではない）                                   |
| **クォート**           | シングルクォート                                                                |
| **セミコロン**         | あり                                                                            |
| **インデント**         | スペース 2                                                                      |
| **行幅**               | 100文字                                                                         |
| **末尾カンマ**         | ES5                                                                             |
| **Service/Repository** | オブジェクトリテラル（classは使わない）                                         |
| **エラー**             | カスタム AppError サブクラスを throw                                            |
| **DB列名**             | snake_case（Prisma `@@map` / `@map` で対応）                                    |
| **TS プロパティ**      | camelCase（Prisma モデルフィールド名）                                          |
| **パスエイリアス**     | `@/` → `./src/`（import map で解決）                                            |
| **状態管理**           | サーバー状態=TanStack Query, UI状態=Zustand, フォーム=react-hook-form           |
| **Zodバージョン**      | Zod v4（`z.iso.date()`, `z.iso.datetime()`, `.partial()` が `.default()` 保持） |
| **Zodフォーム型**      | `z.input<typeof schema>` (入力型) / `z.infer<typeof schema>` (出力型)           |
| **スキーマ共有**       | `@<scope>/api/schemas` サブパスエクスポート経由                                 |

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
// バレルエクスポート（features/<name>/index.ts）
export { exampleRoutes } from './routes.ts';

// 内部モジュールは index.ts に含めない → 外部からアクセス不可
// repository.ts, service.ts, schema.ts, constants.ts は非公開
// （schema.ts, constants.ts は schemas/ サブパスエクスポート経由でWebが参照）
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

### Phase 2: api パッケージ

- [ ] `packages/api/deno.json` 作成（`exports` にサブパス `"./schemas"` を含める）
- [ ] `packages/api/prisma/schema.prisma` 作成（Prisma スキーマ定義）
- [ ] `packages/api/prisma.config.ts` 作成（datasource URL 設定）
- [ ] `packages/api/src/index.ts` 作成（Deno.serve エントリーポイント）
- [ ] `packages/api/src/app.ts` 作成（Honoアプリ + AppType）
- [ ] `packages/api/src/db/index.ts` 作成（Prisma Client 接続 + `setPrisma()` テスト用DI）
- [ ] `packages/api/src/schemas/index.ts` 作成（Web向けZodスキーマ・定数の集約エクスポート）
- [ ] `packages/api/src/middleware/` 作成（LogTape logger, error-handler）
- [ ] `packages/api/src/lib/errors.ts` 作成
- [ ] `packages/api/src/features/health/` 作成（最小feature）
- [ ] `packages/api/src/test/setup.ts` 作成（PostgreSQL Docker + Prisma テストセットアップ）
- [ ] サンプルfeatureを1つ作成（schema → constants → openapi → repository → service → routes →
      tests）
- [ ] `deno task --filter '@app/api' db:generate` — Prisma Client 生成

### Phase 3: web パッケージ

- [ ] `packages/web/deno.json` 作成
- [ ] `packages/web/vite.config.ts` 作成（`@<scope>/api/schemas` の `resolve.alias` を含める）
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

### Phase 4: 検証

- [ ] `deno install` — 依存解決確認
- [ ] `deno lint` — エラーなし
- [ ] `deno fmt --check` — フォーマット確認
- [ ] `deno task --filter '@app/api' test` — APIテスト通過
- [ ] `deno task --filter '@app/web' test` — Webテスト通過
- [ ] `deno task dev` — API + Web 同時起動
- [ ] `deno run -A npm:vite build`（web）— ビルド成功
- [ ] API → Web の型安全RPC接続確認

---

## 11. デプロイ（Deno Deploy）

### 11.1 デプロイ構成

本ボイラープレートは **単一デプロイメント構成** を採用。Hono API が API ルート (`/api/*`) と Vite
ビルド出力（SPA）の両方を配信する。

```text
[Deno Deploy]
  packages/api/src/index.ts (エントリポイント)
    └── app.ts
         ├── /api/* → API ルート (JSON)
         ├── /assets/* → serveStatic (Vite ビルド出力)
         └── /* → SPA フォールバック (index.html)
```

**メリット:**

- API と SPA が同一オリジン（CORS 不要）
- Deno Deploy 1プロジェクトで完結
- フロントエンドの API URL 設定が不要（相対パス `/api/*`）

### 11.2 静的ファイル配信

`app.ts` で本番環境のみ `serveStatic`（`hono/deno`）を登録:

```typescript
import { serveStatic } from 'hono/deno';

if (!isDevelopment) {
  const staticDir = Deno.env.get('STATIC_DIR') || './packages/web/dist';
  app.use('*', serveStatic({ root: staticDir }));
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith('/api')) return next();
    return serveStatic({ root: staticDir, path: 'index.html' })(c, next);
  });
}
```

- `DENO_ENV=production` で有効化（開発時は Vite dev サーバーが配信）
- `/api/*` リクエストは SPA フォールバックをスキップし、JSON 404 を返す
- `STATIC_DIR` 環境変数でパスを上書き可能（デフォルト: `./packages/web/dist`）

### 11.3 環境変数（Deno Deploy ダッシュボード）

| 変数           | 値                                                      | 説明                                              |
| -------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL` | `postgresql://...@....neon.tech/app_db?sslmode=require` | Neon 接続文字列                                   |
| `DENO_ENV`     | `production`                                            | 本番モード（CORS無効化 + 静的ファイル配信有効化） |
| `JWT_SECRET`   | (ランダム文字列)                                        | JWT 署名用シークレット                            |

`@std/dotenv/load` は Deno Deploy 上で安全に no-op となる（`Deno.readTextFileSync` が
利用不可のため）。環境変数はダッシュボードで設定する。

### 11.4 ビルド＆プレビュー

```bash
# Web ビルド（デプロイ前に必須）
deno task build:web

# ローカルで本番構成を検証
deno task deploy:preview
# → http://localhost:3000 でSPA + API を確認
```

### 11.5 CI/CD（GitHub Actions）

2つのワークフローを用意:

| ファイル                       | トリガー    | ジョブ                                        |
| ------------------------------ | ----------- | --------------------------------------------- |
| `.github/workflows/ci.yml`     | PR → main   | prepare → lint, fmt, typecheck, test, build   |
| `.github/workflows/deploy.yml` | push → main | prepare → lint, fmt, typecheck, test → deploy |

**CI ワークフロー** (`ci.yml`) — PR 時に品質チェック:

```text
prepare (deno install + prisma generate + upload artifact: deno-deps)
  ├─ lint-and-format
  ├─ typecheck
  ├─ test-api (PostgreSQL service container + prisma db push)
  └─ build-web
```

**Deploy ワークフロー** (`deploy.yml`) — main マージ時に CI + デプロイ:

```text
prepare (deno install + prisma generate + upload artifact: deno-deps)
  ├─ lint-and-format ─┐
  ├─ typecheck ───────┼─→ deploy (build:web + Deno Deploy)
  └─ test-api ────────┘
```

`deno install` + `prisma generate` は `prepare` ジョブで1回のみ実行し、`node_modules` +
`packages/api/generated` を artifact (`deno-deps`) として配布する。`test-api` ジョブは PostgreSQL
サービスコンテナ（`app_test` DB）を起動し、`prisma db push`
でスキーマを適用してからテストを実行する。

### 11.6 Deno Deploy 初期セットアップ

デプロイ前に以下の設定が必要:

#### 1. Deno Deploy プロジェクト作成

1. [dash.deno.com](https://dash.deno.com) にアクセス
2. 「New Project」→ プロジェクト名を入力（`deploy.yml` の `project` に一致させる）
3. 「Deploy from GitHub Actions」を選択
4. GitHub リポジトリをリンク

#### 2. 環境変数設定（Deno Deploy ダッシュボード）

プロジェクトの Settings → Environment Variables で以下を設定:

| 変数           | 値                                                 | 必須 |
| -------------- | -------------------------------------------------- | ---- |
| `DATABASE_URL` | `prisma+postgres://...@db.prisma.io:5432/postgres` | Yes  |
| `DENO_ENV`     | `production`                                       | Yes  |
| `JWT_SECRET`   | (ランダム文字列)                                   | Yes  |

#### 3. GitHub リポジトリ設定

GitHub リポジトリの Settings → Secrets and variables → Actions → **Variables** タブで以下を設定:

| Variable              | 値                           | 説明                                                     |
| --------------------- | ---------------------------- | -------------------------------------------------------- |
| `DENO_DEPLOY_PROJECT` | Deno Deploy のプロジェクト名 | `deploy.yml` が `${{ vars.DENO_DEPLOY_PROJECT }}` で参照 |

認証は OIDC（OpenID Connect）で自動的に行われるため **Secrets の設定は不要**。

必要な Actions パーミッション（ワークフロー内で設定済み）:

```yaml
permissions:
  id-token: write # OIDC 認証に必要
  contents: read # チェックアウトに必要
```

### 11.7 deployctl パラメータ

| パラメータ   | 値                                                   | 説明                             |
| ------------ | ---------------------------------------------------- | -------------------------------- |
| `project`    | `${{ vars.DENO_DEPLOY_PROJECT }}`                    | GitHub Variables から読み取り    |
| `entrypoint` | `packages/api/src/index.ts`                          | Hono API エントリポイント        |
| `root`       | `.`                                                  | モノレポルート（パス解決のため） |
| `include`    | `packages/api,packages/web/dist,deno.json,deno.lock` | デプロイに含めるファイル         |
| `exclude`    | `node_modules,...`                                   | デプロイから除外するファイル     |

---

> **このDeno版計画書は pnpm/Node.js版 `PNPM_BOILERPLATE_BLUEPRINT.md`
> をベースに、Deno向けに全面改訂したものです。** **`<project-name>`, `<scope>`, `<db_name>`
> はプロジェクトに合わせて置換してください。**
