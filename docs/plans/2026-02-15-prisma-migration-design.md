# 設計: Drizzle ORM → Prisma ORM 移行

> 作成日: 2026-02-15

## 背景

Deno Deploy が Prisma Postgres を公式パートナーとして統合しており、マネージド DB
(ダッシュボードからプロビジョニング、ブランチ DB) を提供している。Deno Deploy
のレールに乗る判断として、ORM を Drizzle から Prisma に、DB を Neon から Prisma Postgres
に移行する。

> **注意:** `DATABASE_URL` の自動注入はない。Deno Deploy ダッシュボードで手動設定が必要。 Prisma
> Postgres は Tokyo リージョン (`ap-northeast-1`) を選択可能。

---

## セクション 1: 移行概要 — 変わるもの・変わらないもの

### 変わるもの (repository 層 + DB 設定のみ)

| 対象            | Before                                | After                                       |
| --------------- | ------------------------------------- | ------------------------------------------- |
| ORM             | Drizzle ORM                           | Prisma ORM 7+ (pure TS, `runtime = "deno"`) |
| DB サービス     | Neon (Singapore)                      | Prisma Postgres (Tokyo 選択可)              |
| テーブル定義    | `table.ts` (Drizzle `pgTable`)        | `prisma/schema.prisma`                      |
| DB クライアント | `src/db/index.ts` (Drizzle)           | `src/db/index.ts` (PrismaClient)            |
| Repository      | Drizzle クエリ API                    | Prisma Client API                           |
| テスト DB       | PGLite (in-memory WASM)               | Docker PostgreSQL                           |
| DB ドライバ     | `drizzle-orm/neon-http` or `postgres` | `@prisma/adapter-pg` (TCP 直接接続)         |
| 設定ファイル    | `drizzle.config.ts`                   | `prisma.config.ts` + `prisma/schema.prisma` |

### 変わらないもの (アプリケーション層はそのまま)

| 対象                   | 理由                                                  |
| ---------------------- | ----------------------------------------------------- |
| `schema.ts` (純粋 Zod) | ORM 非依存。バリデーション専用                        |
| `openapi.ts`           | Zod + OpenAPI メタデータのみ                          |
| `service.ts`           | repository インターフェース経由。ORM を直接触らない   |
| `routes.ts`            | ほぼ変更なし (型 import の調整のみ)                   |
| Web パッケージ全体     | API の型 (`AppType`) と Zod スキーマのみ依存          |
| Hono フレームワーク    | ORM と無関係                                          |
| デプロイフロー         | Deno Deploy のまま。Pre-Deploy コマンドを追加するだけ |

### 移行の影響範囲

```text
routes.ts → service.ts → repository.ts → db/index.ts
                              ↑ ここだけ変更    ↑ ここだけ変更
```

---

## セクション 2: Prisma Schema 設計

### ファイル: `packages/api/prisma/schema.prisma`

```prisma
// packages/api/prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  runtime  = "deno"
}

datasource db {
  provider = "postgresql"
  // URL は prisma.config.ts で設定 (Prisma 7 推奨)
}

model Example {
  id        String   @id @default(uuid()) @db.Uuid
  date      String   @unique @db.Date
  field1    Boolean  @default(false)
  field2    String   @db.Text
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@map("examples")
}
```

### ファイル: `packages/api/prisma.config.ts` (Prisma 7 新規)

Prisma 7 では `datasource.url` を `schema.prisma` ではなく `prisma.config.ts`
で設定する（`schema.prisma` 内の `url` は非推奨）。

```ts
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // CLI (migrate dev/deploy) が使用する接続先
    url: env('DATABASE_URL'),
  },
});
```

### 設計ポイント

| 項目                | 決定                  | 理由                                                                                                                                                       |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`          | `"prisma-client"`     | Prisma 7 の新プロバイダ。旧 `prisma-client-js` は非推奨                                                                                                    |
| `output`            | `../generated/prisma` | `.gitignore` 対象。デプロイ時に毎回再生成。Prisma 7 では `output` は必須                                                                                   |
| `runtime`           | `"deno"`              | Prisma 7+ の Deno ネイティブサポート。Pure TS (Rust エンジン不要)                                                                                          |
| `date` カラム       | `String @db.Date`     | 公式ドキュメントの正式な型マッピング。TS 側で `string` 型を返す。既存の Drizzle `mode: 'string'` と一致し、Zod `z.iso.date()` でそのままバリデーション可能 |
| `@@map("examples")` | テーブル名を明示      | Drizzle の既存テーブル名と一致させる                                                                                                                       |
| `@updatedAt`        | Prisma 自動管理       | Drizzle の `.$onUpdate()` を置き換え                                                                                                                       |
| `prisma.config.ts`  | CLI 設定を分離        | Prisma 7 推奨パターン。`schema.prisma` の `url` は非推奨                                                                                                   |

### 既存テーブルとの互換性

既存データはないため、`prisma migrate dev --name init`
で初回マイグレーションを作成し、クリーンスタートする。

---

## セクション 3: DB クライアントと feature 構造の変更

### `src/db/index.ts` (書き換え)

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';

const adapter = new PrismaPg({
  connectionString: Deno.env.get('DATABASE_URL')!,
});

export const prisma = new PrismaClient({ adapter });
```

**変更点:**

- Drizzle のドライバ自動切り替えロジック削除
- `@prisma/adapter-pg` で PostgreSQL に TCP 直接接続（Prisma 7 ではドライバアダプタが必須）
- `DATABASE_URL` は Deno Deploy ダッシュボードで手動設定
  - Prisma Postgres 直接接続: `postgres://USER:PASS@db.prisma.io:5432/postgres?sslmode=require`
  - ローカル開発: `postgresql://postgres:postgres@localhost:5432/app`

> **補足: Prisma Accelerate (オプション)**
>
> Prisma Postgres にはビルトインの接続プーリング + キャッシュ (Accelerate) がある。
> 将来的にキャッシュを活用したい場合は `@prisma/extension-accelerate` を追加し、
> `prisma+postgres://` 形式の URL を使用する。初期移行では直接 TCP 接続で十分。

### `src/features/example/repository.ts` (書き換え)

```ts
import { prisma } from '../../db/index.ts';

// Before (Drizzle)
export const findAll = () => db.select().from(examples).orderBy(examples.date);

// After (Prisma)
export const findAll = () => prisma.example.findMany({ orderBy: { date: 'asc' } });
```

主な変換パターン:

| Drizzle                                                  | Prisma                                           |
| -------------------------------------------------------- | ------------------------------------------------ |
| `db.select().from(t).where(eq(t.id, id))`                | `prisma.example.findUnique({ where: { id } })`   |
| `db.insert(t).values(data).returning()`                  | `prisma.example.create({ data })`                |
| `db.update(t).set(data).where(eq(t.id, id)).returning()` | `prisma.example.update({ where: { id }, data })` |
| `db.delete(t).where(eq(t.id, id)).returning()`           | `prisma.example.delete({ where: { id } })`       |

### feature 構造の変化

```text
features/example/
├── table.ts        → 削除 (prisma/schema.prisma に統合)
├── schema.ts       → 変更なし
├── openapi.ts      → 変更なし
├── repository.ts   → Prisma Client API に書き換え
├── service.ts      → 変更なし
└── routes.ts       → 型 import の微調整のみ
```

**削除するファイル:**

- `src/features/example/table.ts`
- `src/db/tables.ts`
- `drizzle.config.ts`

**`packages/api/deno.json` 依存関係の変更:**

```jsonc
// 削除する imports
"drizzle-orm": "...",
"drizzle-kit": "...",
"drizzle-zod": "...",
"postgres": "...",
"@neondatabase/serverless": "...",

// 追加する imports
"@prisma/adapter-pg": "npm:@prisma/adapter-pg@^7.0.0",
"@prisma/client": "npm:@prisma/client@^7.0.0",
"prisma": "npm:prisma@^7.0.0",
```

**`packages/api/deno.json` tasks の変更:**

```jsonc
// 削除
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",

// 追加
"db:generate": "deno run -A --env=.env npm:prisma generate",
"db:migrate": "deno run -A --env=.env npm:prisma migrate dev",
"db:deploy": "deno run -A --env=.env npm:prisma migrate deploy",
"db:studio": "deno run -A --env=.env npm:prisma studio",
```

---

## セクション 4: テスト戦略

### Before → After

| 項目           | Before (Drizzle)             | After (Prisma)                       |
| -------------- | ---------------------------- | ------------------------------------ |
| DB エンジン    | PGLite (WASM, in-memory)     | Docker PostgreSQL                    |
| セットアップ   | `useTestDb()` → `pushSchema` | `prisma migrate deploy` → `TRUNCATE` |
| CI             | DB 不要                      | `services: postgres` コンテナ        |
| Service テスト | Mock repository              | Mock repository (変更なし)           |

### PGLite → Docker PostgreSQL に変える理由

Prisma Client は PGLite をサポートしていない。Prisma のテストは実際の PostgreSQL
インスタンスが必要。

### テストセットアップ (`src/test/setup.ts`)

```ts
import { PrismaClient } from '../../../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient;

export function useTestDb() {
  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: Deno.env.get('TEST_DATABASE_URL') ??
        'postgresql://postgres:postgres@localhost:5432/test',
    });
    prisma = new PrismaClient({ adapter });
  });

  beforeEach(async () => {
    // テーブルを TRUNCATE (高速リセット)
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE examples RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  return {
    get prisma() {
      return prisma;
    },
  };
}
```

### テスト種別ごとの方針

| テスト種別        | DB                        | 変更量                            |
| ----------------- | ------------------------- | --------------------------------- |
| Repository テスト | Docker PostgreSQL (実 DB) | セットアップ書き換え + クエリ変更 |
| Service テスト    | なし (mock repository)    | **変更なし**                      |
| Route テスト      | Docker PostgreSQL or mock | 最小限                            |
| Web テスト (MSW)  | なし                      | **変更なし**                      |

### ローカル開発の DB

`compose.yml` に既にある PostgreSQL コンテナをそのまま使用。テスト用に別 DB (`test`) を作成:

```yaml
# compose.yml に追加 (既存の postgres サービスに)
environment:
  POSTGRES_DB: app
  # テスト用 DB は initdb スクリプトで作成
```

---

## セクション 5: デプロイとマイグレーション戦略

### マイグレーションコマンドの使い分け

| コマンド                 | 用途                               | 環境         |
| ------------------------ | ---------------------------------- | ------------ |
| `prisma migrate dev`     | マイグレーション作成 + 適用        | ローカル開発 |
| `prisma migrate deploy`  | 既存マイグレーションの適用のみ     | 本番 / CI    |
| `prisma migrate diff`    | スキーマ差分の確認                 | レビュー時   |
| `prisma migrate resolve` | 失敗したマイグレーションの手動解決 | 障害対応     |

### Deno Deploy Pre-Deploy コマンド

```text
deno run -A npm:prisma generate && deno run -A npm:prisma migrate deploy
```

- `prisma generate`: Prisma Client を `generated/prisma/` に生成 (Prisma 7 では `output` 指定先)
- `prisma migrate deploy`: `prisma/migrations/` 内の未適用マイグレーションを順次適用
- **冪等性**: 適用済みのマイグレーションはスキップされる
- 新しいマイグレーションがない場合、`migrate deploy` は何もしない (安全)
- **注意:** `prisma.config.ts` で `DATABASE_URL` を参照するため、Deno Deploy
  の環境変数に設定済みである必要がある

### CI ワークフロー

```yaml
# ci.yml (API テストジョブに追加)
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_DB: test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - uses: denoland/setup-deno@v2
  - run: deno install
    working-directory: packages/api
  - run: deno run -A npm:prisma generate
    working-directory: packages/api
  - run: deno run -A npm:prisma migrate deploy
    working-directory: packages/api
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  - run: deno task --filter '@app/api' test
    env:
      TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

### ロールバック戦略

Prisma には自動ロールバック機能がない。以下の 3 層で対応する。

**第 1 層: 予防 (2-step マイグレーション)**

破壊的変更 (カラム削除、リネーム等) は 2 回のデプロイに分けて実施:

```text
Deploy 1: カラム追加 + データコピー + コードを新カラムに切り替え
Deploy 2: 旧カラム削除
```

これにより、Deploy 1 の時点でロールバックしても旧カラムが残っているため安全。

**第 2 層: リカバリ (`migrate resolve`)**

マイグレーション適用が途中で失敗した場合:

```bash
# 失敗したマイグレーションを「手動解決済み」としてマーク
prisma migrate resolve --applied "20260215_add_column"
# または、ロールバック SQL を手動実行後
prisma migrate resolve --rolled-back "20260215_add_column"
```

**第 3 層: 災害復旧 (DB バックアップ)**

Prisma Postgres のポイントインタイムリカバリ (PITR) を利用。Deno Deploy
ダッシュボードからバックアップ復元が可能。

---

## セクション 6: 実装ステップの順序

移行は 1 つの feature ブランチで一括実行する。段階的移行 (Drizzle と Prisma の共存)
は複雑さが増すだけなので避ける。

### ステップ順序

| #  | 作業                                                                    | 影響範囲                     |
| -- | ----------------------------------------------------------------------- | ---------------------------- |
| 1  | `.gitignore` に `generated/prisma/` 追加                                | 1 行 (generate 前に設定)     |
| 2  | `prisma/schema.prisma` 作成                                             | 新規ファイル                 |
| 3  | `prisma.config.ts` 作成                                                 | 新規ファイル (Prisma 7 必須) |
| 4  | `deno.json` 依存関係の入れ替え (Drizzle → Prisma) + tasks 更新          | packages/api/deno.json       |
| 5  | `deno task db:generate` で Prisma Client 生成                           | generated/prisma/            |
| 6  | `src/db/index.ts` を Prisma Client に書き換え                           | 1 ファイル                   |
| 7  | `src/features/example/repository.ts` を Prisma API に書き換え           | 1 ファイル                   |
| 8  | `src/features/example/routes.ts` の型 import 調整                       | 最小変更                     |
| 9  | Drizzle 関連ファイル削除 (`table.ts`, `tables.ts`, `drizzle.config.ts`) | 削除のみ                     |
| 10 | テストセットアップ書き換え (`src/test/setup.ts`)                        | 1 ファイル                   |
| 11 | テスト実行・修正                                                        | 既存テスト                   |
| 12 | CI ワークフロー更新 (PG サービスコンテナ + prisma generate)             | ci.yml                       |
| 13 | Deno Deploy Pre-Deploy コマンド設定                                     | deploy.yml / ダッシュボード  |
| 14 | ドキュメント更新                                                        | 下記参照                     |
| 15 | ローカル動作確認 → PR 作成                                              | —                            |

### ステップ 14: ドキュメント更新の詳細

| ファイル                             | 更新内容                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                          | ORM を Prisma に変更、DB タスク一覧更新、テスト方式 (PGLite → Docker PG)、feature 構造から `table.ts` 削除、Gotchas に Prisma 関連追加 |
| `docs/deno-boilerplate-blueprint.md` | 技術スタック・アーキテクチャ図・DB 関連セクションを Prisma + Prisma Postgres に更新                                                    |

### 重要な原則

- **schema.ts / openapi.ts / service.ts / web パッケージは一切触らない**
- ステップ 1-9 は連続作業 (途中で動作確認不要)
- ステップ 10-11 でテストが通ることを確認してから CI 更新に進む
- ステップ 14 は実装完了後、PR 作成前に行う
- feature が 1 つ (example) しかないので、移行は 1 回で完了
- 既存データはないため、DB はクリーンスタート (`prisma migrate dev --name init`)

---

## セクション 7: Prisma 7 固有の注意事項

調査 (2026-02-15) に基づく Prisma 7 の重要な変更点と注意事項。

### Prisma 7 の主要な変更点

| 変更点                     | 詳細                                                            |
| -------------------------- | --------------------------------------------------------------- |
| Pure TypeScript            | Rust バイナリエンジン廃止。ダウンロード不要・バンドルサイズ削減 |
| `prisma-client` プロバイダ | 旧 `prisma-client-js` は非推奨。将来削除予定                    |
| `output` 必須              | `node_modules` への自動生成は廃止。明示的な出力先が必要         |
| ドライバアダプタ必須       | すべての DB 接続にアダプタが必要 (`@prisma/adapter-pg` 等)      |
| `prisma.config.ts`         | `datasource.url` の設定先。`schema.prisma` 内の `url` は非推奨  |
| Node.js 20.19+             | 最低要件。TypeScript 5.4.0+                                     |

### 既知の制限事項

- **Mapped enum バグ (v7.2.0 時点):** `@map` 付き enum
  でランタイムエラーが発生する既知バグあり。本プロジェクトでは enum を使っていないため影響なし
- **`@prisma/adapter-pg`** は `pg` (node-postgres) ドライバに依存。Deno の `nodeModulesDir: "auto"`
  が必要

### Prisma Postgres の接続パターン

```text
┌─────────────────────────────────────────────────────────────┐
│ 接続パターン 1: 直接 TCP (本設計で採用)                      │
│ URL: postgres://USER:PASS@db.prisma.io:5432/postgres        │
│ アダプタ: @prisma/adapter-pg (PrismaPg)                     │
│ 特徴: シンプル、レイテンシ最小                                │
├─────────────────────────────────────────────────────────────┤
│ 接続パターン 2: Accelerate proxy (将来オプション)             │
│ URL: prisma+postgres://accelerate.prisma-data.net/?api_key= │
│ 拡張: @prisma/extension-accelerate                          │
│ 特徴: コネクションプーリング + キャッシュ (TTL/SWR)           │
└─────────────────────────────────────────────────────────────┘
```

### `String @db.Date` の型マッピング

Prisma の PostgreSQL ネイティブ型マッピング (本プロジェクトで使用する型):

| Schema 宣言                | PostgreSQL カラム型 | TypeScript 型 | 入出力               |
| -------------------------- | ------------------- | ------------- | -------------------- |
| `String @db.Date`          | `date`              | `string`      | `"2024-03-15"` 形式  |
| `DateTime @db.Date`        | `date`              | `Date`        | JS Date オブジェクト |
| `DateTime @db.Timestamptz` | `timestamptz`       | `Date`        | JS Date オブジェクト |
| `String @db.Text`          | `text`              | `string`      | テキスト             |
| `String @db.Uuid`          | `uuid`              | `string`      | UUID 文字列          |

`String @db.Date` は公式ドキュメントでは `DateTime @db.Date` が推奨されているが、 `string`
型で返す動作は正常に機能する。Drizzle の `mode: 'string'` との互換性を保つために採用。
