# データベースサービス比較・調査

> 調査日: 2026-02-15

---

## Part 1: PostgreSQL サービス比較 — Prisma Postgres vs Neon

### 1. サービス概要

| 項目 | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| 運営 | Prisma (独立) | Databricks (2025年5月に約$1Bで買収) |
| 基盤 | Cloudflare + Unikraft (unikernel) | AWS / Azure |
| アーキテクチャ | unikernel ベース、常時稼働 | compute-storage 分離、scale-to-zero |
| コールドスタート | 数ミリ秒 (実質ゼロ) | 500ms〜数秒 |
| オープンソース | No | Yes (コア部分) |
| GA 時期 | 2025年初頭 | 2023年 |

### 2. 料金

#### 2.1 無料枠

| 項目 | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| 月額 | $0 | $0 |
| ストレージ | 500 MB | 500 MB / project |
| 計算リソース | 100K operations | 100 CU-hours / project |
| DB 数 | 5 | 100 projects |
| カード登録 | 不要 | 不要 |

#### 2.2 有料プラン

##### Prisma Postgres 有料プラン

| 項目 | Starter | Pro | Business |
| --- | --- | --- | --- |
| 月額 | $10 | $49 | $129 |
| Operations | 1M 込 | 10M 込 | 50M 込 |
| 超過 ops | $0.008/1K | $0.002/1K | $0.001/1K |
| ストレージ | 10 GB 込 → $2/GB | 50 GB 込 → $1.50/GB | 100 GB 込 → $1/GB |
| DB 数 | 10 | 100 | 1,000 |
| バックアップ | なし | 日次 (7日保持) | 日次 (30日保持) |
| Spend limit | なし | あり | あり |

##### Neon 有料プラン

| 項目 | Launch | Scale | Business |
| --- | --- | --- | --- |
| 月額目安 | ~$15〜 | ~$701〜 | カスタム |
| Compute | $0.106/CU-hour | $0.222/CU-hour | カスタム |
| Storage | $0.35/GB-month | $0.35/GB-month | カスタム |
| 最大インスタンス | 16 CU (64 GB RAM) | 56 CU (224 GB RAM) | カスタム |
| リストア期間 | 7日 | 30日 | カスタム |
| ブランチ | 10 込 | 25 込 | カスタム |
| コンプライアンス | — | SOC2, HIPAA | SOC2, HIPAA |

#### 2.3 課金モデルの違い

- **Prisma Postgres**: オペレーション課金。read/write 1回 = 1 operation。クエリの複雑さに関係なく均一
- **Neon**: compute 時間 + storage。重いクエリほどコストが上がる。scale-to-zero で未使用時は課金なし

### 3. リージョン

| リージョン | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| US West | San Francisco | Oregon |
| US East | N. Virginia | N. Virginia, Ohio |
| EU | Paris, Frankfurt | Frankfurt, London |
| Asia (日本) | **東京** | **なし** |
| Asia (その他) | Singapore | Singapore, Sydney |
| 南米 | — | São Paulo |
| 中東 | — | Tel Aviv |
| Azure | — | Virginia, Arizona, Frankfurt |

日本向けサービスの場合、東京リージョンの有無は大きな差になる。
Neon の最寄りは Singapore で、日本からのレイテンシは数十ms 追加される。

### 4. 機能比較

| 機能 | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| ブランチング | なし | あり (copy-on-write) |
| Scale-to-zero | なし (常時稼働) | あり |
| 接続プーリング | 組込み | 組込み |
| グローバルキャッシュ | あり (エッジ) | なし (Read Replica で代替) |
| pgvector | 対応 | 対応 |
| Read Replica | — | あり |
| Private Networking | — | Scale 以上 |
| クエリタイムアウト | Free 10s / Pro 20s / Biz 60s | 制限緩い |
| レスポンスサイズ上限 | Free 5 MB / Pro 10 MB / Biz 20 MB | 制限緩い |

### 5. 技術スタックとの相性

本プロジェクト (Deno 2.6 + Hono + Drizzle ORM + Deno Deploy) との相性を評価する。

| 観点 | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| Deno Deploy | 対応 (HTTP/WS driver) | 対応 (`@neondatabase/serverless`) |
| Drizzle ORM | postgres.js 経由で接続可能。serverless driver は未対応 | ネイティブ対応 (`drizzle-orm/neon-http`) |
| Hono | 標準 PG ドライバ経由 | serverless driver で直接接続 |
| マイグレーション | Drizzle Kit (postgres.js TCP) | Drizzle Kit (postgres.js TCP) |

#### 現在のプロジェクト設計との互換性

`packages/api/src/db/index.ts` は `DATABASE_URL` に `neon.tech` が含まれるかで driver を自動切替する
設計になっている。Neon であればそのまま動作し、Prisma Postgres へ移行する場合は postgres.js (TCP) 側の
パスで接続可能。

### 6. ベンダーロックイン・移行性

| 項目 | **Prisma Postgres** | **Neon** |
| --- | --- | --- |
| データエクスポート | pg_dump 対応、直接接続可能 | pg_dump 対応、標準 PG 互換 |
| ORM 非依存 | Drizzle 等で接続可能 | 完全に ORM 非依存 |
| セルフホスト | 不可 | 可能 (OSS コア) |
| 標準 PG 互換 | 互換 (制約あり) | 高い互換性 |

どちらも標準 PostgreSQL ベースのため、`pg_dump` → 別サービスへ `pg_restore` で移行可能。
Drizzle Kit でスキーマ管理していれば、マイグレーション自体はどの PG サービスでも再適用できる。

### 7. 将来性

#### Prisma Postgres の将来性

- Prisma ORM エコシステムとの深い統合が強み
- GA から日が浅く、機能拡充の途上
- Drizzle serverless driver 対応は「今後」と明記されている

#### Neon の将来性

- 2025年5月に Databricks が約$1B で買収。エンタープライズ基盤の資金力
- 買収後に compute 15-25% 値下げ、storage $1.75 → $0.35/GB に大幅値下げ実施済み
- AI Agent ワークロードを主要ユースケースとして注力 (プロビジョン DB の 80%+ が AI Agent 経由)
- OSS コミュニティが活発

### 8. 総合評価

#### 本プロジェクトにおける推奨: Neon

Neon を推奨する理由:

1. **Drizzle ORM とのネイティブ統合** — `drizzle-orm/neon-http` が成熟。Prisma Postgres の
   serverless driver は Drizzle 未対応
2. **既存コードとの互換性** — `db/index.ts` の driver 自動切替が Neon を前提に設計済み
3. **Databricks の資金力と値下げ実績** — 長期的な価格安定・改善が期待できる
4. **ブランチング** — PR ごとの DB ブランチは CI/CD で強力
5. **OSS** — 万一の撤退時にセルフホスト可能

#### Prisma Postgres が優位なケース

1. **東京リージョンが必須** — 日本ユーザー向けの低レイテンシが最優先の場合
2. **コールドスタート許容不可** — scale-to-zero 後の 500ms〜数秒が許容できない場合
3. **軽量クエリが大量** — operation 課金のほうが compute 時間課金より安くなるワークロード

### 9. 移行リスクを最小化するベストプラクティス

どちらを選んでも、以下の設計原則を守ることでサービス間の移行コストを最小化できる。

1. **ORM レイヤーで抽象化** — Drizzle ORM 経由でアクセスし、driver 部分だけ差し替え可能にする
2. **環境変数で切替** — `DATABASE_URL` を変えるだけでサービスを切り替えられる設計を維持
3. **マイグレーションは Drizzle Kit** — サービス固有の migrate ツールではなく Drizzle Kit で管理
4. **serverless driver に過度依存しない** — 標準 postgres.js (TCP) でも接続できるフォールバックを維持
5. **定期的に pg_dump** — エクスポート可能な状態を常に維持

### Part 1 参考リンク

- [Prisma Postgres Pricing](https://www.prisma.io/pricing)
- [Prisma Postgres FAQ](https://www.prisma.io/docs/postgres/more/faq)
- [Prisma Postgres Serverless Driver](https://www.prisma.io/docs/postgres/database/serverless-driver)
- [Drizzle + Prisma Postgres 接続ガイド](https://orm.drizzle.team/docs/connect-prisma-postgres)
- [Neon Pricing](https://neon.com/pricing)
- [Neon Regions](https://neon.com/docs/introduction/regions)
- [Neon + Drizzle ORM](https://orm.drizzle.team/docs/get-started/neon-new)
- [Databricks × Neon 買収発表](https://www.databricks.com/company/newsroom/press-releases/databricks-agrees-acquire-neon-help-developers-deliver-ai-systems)
- [Neon vs Prisma Postgres ベンチマーク](https://bejamas.com/compare/neon-vs-prisma-postgres)

---

## Part 2: Deno Deploy データベース機能と Neon の組み合わせ

### 1. Deno Deploy のデータベース機能

Deno Deploy には「Databases」タブがあり、2 種類のデータベースエンジンをサポートしている。

#### 1.1 Deno KV

Deno ランタイムに組込みの Key-Value ストア。FoundationDB ベース。

| 特徴 | 詳細 |
| --- | --- |
| データモデル | Key-Value (階層的キー) |
| 一貫性 | 強整合性 (external consistency) |
| トランザクション | ACID 対応 |
| リアルタイム | `Deno.openKv()` の `watch()` でキー変更を監視可能 |
| レプリケーション | プライマリ: US East (Virginia)、リードレプリカ: Europe, Asia |
| バックアップ | S3/GCS への継続的バックアップ、ポイントインタイムリカバリ |
| セルフホスト | 可能 ([denokv](https://github.com/denoland/denokv)) |

Deno Deploy プランに含まれる料金:

| 項目 | Free | Pro ($20/mo) |
| --- | --- | --- |
| ストレージ | 1 GiB | 5 GB → $0.75/GiB |
| Read units | 450K/月 | 1.3M/月 → $1/M |
| Write units | 300K/月 | 900K/月 → $2.50/M |

制限事項:

- KV Queue は Deno Deploy EA では未対応
- リードレプリカのリージョン選択不可
- プライマリリージョンは US East 固定
- ビジュアル DB エクスプローラなし

#### 1.2 マネージド PostgreSQL (Prisma Postgres 経由)

Deno Deploy のダッシュボードから直接 PostgreSQL をプロビジョニングできる。
バックエンドは Prisma Postgres が提供している。

主な機能:

- **環境分離**: production / Git ブランチ / プレビューごとに自動で別 DB を作成
- **自動環境変数注入**: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- **Pre-Deploy コマンド**: デプロイ前にマイグレーションを自動実行
- **DB エクスプローラ**: ダッシュボードからテーブル閲覧・クエリ実行
- **複数アプリで共有可能**: 1 インスタンスを複数アプリに割り当て、アプリごとに DB は分離

注意点:

- バックエンドは Prisma Postgres → Prisma ORM 以外の ORM でも接続可能 (標準 PG 接続)
- 「unclaimed」状態ではデフォルト制限あり → Prisma アカウントに「claim」すると制限解除
- 1 アプリにつき 1 DB インスタンスの制限

### 2. 外部 PostgreSQL の接続 (Neon など)

Deno Deploy は外部の PostgreSQL インスタンスもリンクできる。

手順:

1. Databases タブ → 「Link Database」
2. ホスト名、ポート、認証情報、CA 証明書 (任意) を入力
3. 接続テスト → 保存
4. アプリに割り当て → 環境変数が自動注入される

Neon を外部 DB としてリンクした場合も `DATABASE_URL` 等が自動注入されるため、
コード側の変更は不要。

### 3. Neon + Deno Deploy の組み合わせパターン

#### パターン A: Neon を外部 DB としてリンク

```text
Deno Deploy ──(DATABASE_URL 自動注入)──→ Neon (外部リンク)
  └─ Drizzle ORM + neon-http driver
```

メリット:

- Neon のブランチング、scale-to-zero、Read Replica をフル活用
- Drizzle ORM とネイティブ統合 (`drizzle-orm/neon-http`)
- `DATABASE_URL` の自動注入で設定が簡単
- Neon 側でブランチを作れば環境分離も可能

デメリット:

- Deno Deploy の「ブランチごとの自動 DB 分離」は使えない (Prisma Postgres 限定機能)
- Neon ブランチの作成・削除は自前管理 (API or ダッシュボード or CI)
- DB エクスプローラは Deno Deploy ダッシュボードから使えるか不明

#### パターン B: Deno Deploy マネージド (Prisma Postgres) を使用

```text
Deno Deploy ──(自動プロビジョニング)──→ Prisma Postgres
  └─ ブランチごとに自動で DB 分離
  └─ Pre-Deploy でマイグレーション自動実行
```

メリット:

- ゼロ設定。ダッシュボードからプロビジョニングするだけ
- Git ブランチごとの DB 自動分離 (プレビュー環境に最適)
- Pre-Deploy コマンドでマイグレーション自動化
- 東京リージョン (ap-northeast-1) 選択可能

デメリット:

- Drizzle の serverless driver 未対応 (postgres.js TCP 経由で接続)
- Prisma Postgres の制限 (クエリタイムアウト、レスポンスサイズ上限) が適用される
- scale-to-zero なし (常時稼働)
- OSS ではない → セルフホスト不可

#### パターン C: Neon + Deno KV のハイブリッド

```text
Deno Deploy
  ├─ Neon ──→ リレーショナルデータ (ユーザー、注文、etc.)
  └─ Deno KV ──→ セッション、キャッシュ、リアルタイム、一時データ
```

メリット:

- リレーショナルデータは Neon (PostgreSQL) の強みを活かす
- セッション/キャッシュは Deno KV のエッジ配信と低レイテンシを活かす
- KV の `watch()` でリアルタイム機能を安価に実装
- 外部 Redis/Memcached が不要になる

デメリット:

- 2 つのデータストアを管理する運用コスト
- データの整合性管理が複雑になる可能性
- Deno KV はプライマリが US East 固定

### 4. 本プロジェクトへの推奨構成

現在のスタック (Deno Deploy + Hono + Drizzle ORM) に対しては:

#### 短期 (現在): パターン A — Neon 外部リンク

- 既存の `db/index.ts` driver 自動切替がそのまま動作
- Drizzle + `neon-http` のネイティブ統合を活かせる
- ブランチ DB が必要なら Neon API で自前管理

#### 発展時: パターン C — Neon + Deno KV ハイブリッド

以下のユースケースが出てきたら Deno KV を追加:

- セッション管理 (JWT → KV ストアへの移行)
- レート制限 (エッジで高速判定)
- リアルタイム通知 (`watch()` 活用)
- 一時的なキャッシュ (API レスポンスのエッジキャッシュ)

Deno KV は Deno Deploy の Free プランに含まれるため、追加コストなく開始できる。

### 5. Deno Deploy のブランチ DB 自動分離が欲しい場合

Deno Deploy の「ブランチごとの DB 自動分離」は Prisma Postgres 限定だが、
Neon でも同等のワークフローは構築可能:

| 手段 | 方法 |
| --- | --- |
| Neon API | CI で `neon branches create` → `DATABASE_URL` を動的セット |
| GitHub Actions | PR open → Neon ブランチ作成、PR close → 削除 |
| Neon GitHub Integration | Vercel 向けだが、Neon API を直接叩けば同等 |

Neon のブランチは copy-on-write で ~1秒で作成、未使用時は scale-to-zero のため
コスト面でも Prisma Postgres の自動分離と同等以上。

### Part 2 参考リンク

- [Deno Deploy Databases](https://docs.deno.com/deploy/reference/databases/)
- [Deno KV ドキュメント](https://docs.deno.com/deploy/kv/)
- [Deno Deploy + Neon 接続ガイド](https://docs.deno.com/deploy/classic/neon-postgres/)
- [Neon + Deno Deploy ガイド (Neon 公式)](https://neon.com/docs/guides/deno)
- [Deno + Prisma パートナーシップ](https://www.prisma.io/blog/how-deno-and-prisma-partnered-to-power-per-branch-databases)
- [Deno Deploy Pricing](https://deno.com/deploy/pricing)
- [Deno KV 比較 (vs Cloudflare KV, DynamoDB 等)](https://deno.com/blog/comparing-deno-kv)
- [Neon Branching ドキュメント](https://neon.com/docs/introduction/branching)
