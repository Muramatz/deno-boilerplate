# 設計: Drizzle ORM → Prisma ORM 移行

> 作成日: 2026-02-15

## 背景

Deno Deploy が Prisma Postgres を公式パートナーとして統合しており、マネージド DB
(ダッシュボードからプロビジョニング、`DATABASE_URL` 自動注入、ブランチ DB) を提供している。Deno Deploy
のレールに乗る判断として、ORM を Drizzle から Prisma に、DB を Neon から Prisma Postgres に移行する。

---

## セクション 1: 移行概要 — 変わるもの・変わらないもの

### 変わるもの (repository 層 + DB 設定のみ)

| 対象 | Before | After |
|------|--------|-------|
| ORM | Drizzle ORM | Prisma ORM 7+ (pure TS, `runtime = "deno"`) |
| DB サービス | Neon (Singapore) | Prisma Postgres (Tokyo 選択可) |
| テーブル定義 | `table.ts` (Drizzle `pgTable`) | `prisma/schema.prisma` |
| DB クライアント | `src/db/index.ts` (Drizzle) | `src/db/index.ts` (PrismaClient) |
| Repository | Drizzle クエリ API | Prisma Client API |
| テスト DB | PGLite (in-memory WASM) | Docker PostgreSQL |
| DB ドライバ | `drizzle-orm/neon-http` or `postgres` | `@prisma/adapter-pg` |

### 変わらないもの (アプリケーション層はそのまま)

| 対象 | 理由 |
|------|------|
| `schema.ts` (純粋 Zod) | ORM 非依存。バリデーション専用 |
| `openapi.ts` | Zod + OpenAPI メタデータのみ |
| `service.ts` | repository インターフェース経由。ORM を直接触らない |
| `routes.ts` | ほぼ変更なし (型 import の調整のみ) |
| Web パッケージ全体 | API の型 (`AppType`) と Zod スキーマのみ依存 |
| Hono フレームワーク | ORM と無関係 |
| デプロイフロー | Deno Deploy のまま。Pre-Deploy コマンドを追加するだけ |

### 移行の影響範囲

```text
routes.ts → service.ts → repository.ts → db/index.ts
                              ↑ ここだけ変更    ↑ ここだけ変更
```

---

## セクション 2: Prisma Schema 設計

### ファイル: `packages/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  runtime  = "deno"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

### 設計ポイント

| 項目 | 決定 | 理由 |
|------|------|------|
| `output` | `../generated/prisma` | `.gitignore` 対象。デプロイ時に毎回再生成 |
| `runtime` | `"deno"` | Prisma 7+ の Deno ネイティブサポート。Rust エンジン不要 |
| `date` カラム | `String @db.Date` | 既存の Drizzle `mode: 'string'` と一致。Zod `z.iso.date()` でバリデーション |
| `@@map("examples")` | テーブル名を明示 | Drizzle の既存テーブル名と一致させる |
| `@updatedAt` | Prisma 自動管理 | Drizzle の `.$onUpdate()` を置き換え |

### 既存テーブルとの互換性

Prisma Schema は既存の `examples` テーブルと完全に互換。カラム名・型・制約がすべて一致するため、データ移行は不要。

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
- `@prisma/adapter-pg` で PostgreSQL に統一接続
- Deno Deploy では `DATABASE_URL` が自動注入される

### `src/features/example/repository.ts` (書き換え)

```ts
import { prisma } from '../../db/index.ts';

// Before (Drizzle)
export const findAll = () => db.select().from(examples).orderBy(examples.date);

// After (Prisma)
export const findAll = () => prisma.example.findMany({ orderBy: { date: 'asc' } });
```

主な変換パターン:

| Drizzle | Prisma |
|---------|--------|
| `db.select().from(t).where(eq(t.id, id))` | `prisma.example.findUnique({ where: { id } })` |
| `db.insert(t).values(data).returning()` | `prisma.example.create({ data })` |
| `db.update(t).set(data).where(eq(t.id, id)).returning()` | `prisma.example.update({ where: { id }, data })` |
| `db.delete(t).where(eq(t.id, id)).returning()` | `prisma.example.delete({ where: { id } })` |

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

---

## セクション 4: テスト戦略

### Before → After

| 項目 | Before (Drizzle) | After (Prisma) |
|------|-------------------|-----------------|
| DB エンジン | PGLite (WASM, in-memory) | Docker PostgreSQL |
| セットアップ | `useTestDb()` → `pushSchema` | `prisma migrate deploy` → `TRUNCATE` |
| CI | DB 不要 | `services: postgres` コンテナ |
| Service テスト | Mock repository | Mock repository (変更なし) |

### PGLite → Docker PostgreSQL に変える理由

Prisma Client は PGLite をサポートしていない。Prisma のテストは実際の PostgreSQL インスタンスが必要。

### テストセットアップ (`src/test/setup.ts`)

```ts
import { PrismaClient } from '../../../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient;

export function useTestDb() {
  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: Deno.env.get('TEST_DATABASE_URL')
        ?? 'postgresql://postgres:postgres@localhost:5432/test',
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

  return { get prisma() { return prisma; } };
}
```

### テスト種別ごとの方針

| テスト種別 | DB | 変更量 |
|-----------|-----|--------|
| Repository テスト | Docker PostgreSQL (実 DB) | セットアップ書き換え + クエリ変更 |
| Service テスト | なし (mock repository) | **変更なし** |
| Route テスト | Docker PostgreSQL or mock | 最小限 |
| Web テスト (MSW) | なし | **変更なし** |

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

| コマンド | 用途 | 環境 |
|----------|------|------|
| `prisma migrate dev` | マイグレーション作成 + 適用 | ローカル開発 |
| `prisma migrate deploy` | 既存マイグレーションの適用のみ | 本番 / CI |
| `prisma migrate diff` | スキーマ差分の確認 | レビュー時 |
| `prisma migrate resolve` | 失敗したマイグレーションの手動解決 | 障害対応 |

### Deno Deploy Pre-Deploy コマンド

```text
deno run -A npm:prisma generate && deno run -A npm:prisma migrate deploy
```

- `prisma generate`: Prisma Client を `generated/prisma/` に生成
- `prisma migrate deploy`: `prisma/migrations/` 内の未適用マイグレーションを順次適用
- **冪等性**: 適用済みのマイグレーションはスキップされる
- 新しいマイグレーションがない場合、`migrate deploy` は何もしない (安全)

### CI ワークフロー

```yaml
# ci.yml
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_DB: test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

steps:
  - uses: denoland/setup-deno@v2
  - run: deno run -A npm:prisma generate
  - run: deno run -A npm:prisma migrate deploy
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  - run: deno task --filter '@app/api' test
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

| # | 作業 | 影響範囲 |
|---|------|----------|
| 1 | `prisma/schema.prisma` 作成 | 新規ファイル |
| 2 | `deno.json` 依存関係の入れ替え (Drizzle → Prisma) | packages/api/deno.json |
| 3 | `deno task db:generate` で Prisma Client 生成 | generated/prisma/ |
| 4 | `src/db/index.ts` を Prisma Client に書き換え | 1 ファイル |
| 5 | `src/features/example/repository.ts` を Prisma API に書き換え | 1 ファイル |
| 6 | `src/features/example/routes.ts` の型 import 調整 | 最小変更 |
| 7 | Drizzle 関連ファイル削除 (`table.ts`, `tables.ts`, `drizzle.config.ts`) | 削除のみ |
| 8 | テストセットアップ書き換え (`src/test/setup.ts`) | 1 ファイル |
| 9 | テスト実行・修正 | 既存テスト |
| 10 | `.gitignore` に `generated/prisma/` 追加 | 1 行 |
| 11 | CI ワークフロー更新 (PG サービスコンテナ + prisma generate) | ci.yml |
| 12 | Deno Deploy Pre-Deploy コマンド設定 | deploy.yml / ダッシュボード |
| 13 | ドキュメント更新 | 下記参照 |
| 14 | ローカル動作確認 → PR 作成 | — |

### ステップ 13: ドキュメント更新の詳細

| ファイル | 更新内容 |
|----------|----------|
| `CLAUDE.md` | ORM を Prisma に変更、DB タスク一覧更新、テスト方式 (PGLite → Docker PG)、feature 構造から `table.ts` 削除、Gotchas に Prisma 関連追加 |
| `docs/deno-boilerplate-blueprint.md` | 技術スタック・アーキテクチャ図・DB 関連セクションを Prisma + Prisma Postgres に更新 |

### 重要な原則

- **schema.ts / openapi.ts / service.ts / web パッケージは一切触らない**
- ステップ 1-7 は連続作業 (途中で動作確認不要)
- ステップ 8-9 でテストが通ることを確認してから CI 更新に進む
- ステップ 13 は実装完了後、PR 作成前に行う
- feature が 1 つ (example) しかないので、移行は 1 回で完了
