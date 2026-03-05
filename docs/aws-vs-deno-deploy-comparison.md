# デプロイ戦略比較: Deno Deploy + Neon vs AWS 全載せ

> 調査日: 2026-02-15

## 前提

現在の技術スタック: Hono + Drizzle ORM + React 19 (Vite) + Deno 2.6

比較する 2 つの構成:

- **構成 A**: Deno Deploy (API + SPA) + Neon (DB)
- **構成 B**: AWS 全載せ (Lambda + CloudFront + Aurora Serverless v2)

---

## 1. アーキテクチャ比較

### 構成 A: Deno Deploy + Neon

```text
ユーザー → Deno Deploy (エッジ)
             ├─ /api/*  → Hono API → Neon (PostgreSQL, Singapore)
             └─ /*      → Vite SPA 静的ファイル
```

- サービス数: 2 (Deno Deploy + Neon)
- IaC: 不要 (ダッシュボード + GitHub 連携)
- リージョン: Deno Deploy はグローバルエッジ、Neon は Singapore (最寄り)

### 構成 B: AWS 全載せ (東京リージョン)

```text
ユーザー → CloudFront (CDN)
             ├─ /api/*  → API Gateway (HTTP API) → Lambda → Aurora Serverless v2
             └─ /*      → S3 (SPA 静的ファイル)
```

- サービス数: 5+ (CloudFront, S3, API Gateway, Lambda, Aurora)
- IaC: SST / CDK / SAM 等が必要
- リージョン: ap-northeast-1 (東京) に統一可能

---

## 2. 月額コスト試算

### 想定ワークロード

| 指標 | 小規模 (個人/PoC) | 中規模 (スタートアップ) |
| --- | --- | --- |
| リクエスト数/月 | 100K | 5M |
| DB ストレージ | 1 GB | 10 GB |
| DB アイドル率 | 80% | 30% |
| SPA サイズ | 10 MB | 50 MB |
| 転送量/月 | 5 GB | 100 GB |

### 構成 A: Deno Deploy + Neon

#### 小規模

| サービス | プラン | 月額 |
| --- | --- | --- |
| Deno Deploy | Free (1M req, 100GB egress) | $0 |
| Neon | Free (500MB, 100 CU-hours) | $0 |
| **合計** | | **$0** |

#### 中規模

| サービス | プラン | 月額 |
| --- | --- | --- |
| Deno Deploy | Pro ($20 + 超過) | ~$20 |
| Neon | Launch (compute + storage) | ~$30-50 |
| **合計** | | **~$50-70** |

### 構成 B: AWS 全載せ (東京)

#### 小規模

| サービス | 詳細 | 月額 |
| --- | --- | --- |
| CloudFront | Free Tier (3 distributions) | $0 |
| S3 | ~10MB 静的ファイル | ~$0.01 |
| API Gateway | HTTP API 100K req × $1/M | ~$0.10 |
| Lambda | Free Tier (1M req, 400K GB-s) | $0 |
| Aurora Serverless v2 | 0.5 ACU × ~$0.16/h × 730h + storage | **~$120+** |
| **合計** | | **~$120+** |

Aurora の代替として RDS t4g.micro を使う場合:

| サービス | 詳細 | 月額 |
| --- | --- | --- |
| RDS PostgreSQL | t4g.micro + 20GB gp3 | ~$25 |
| その他 (上記と同じ) | | ~$0.11 |
| **合計** | | **~$25** |

#### 中規模

| サービス | 詳細 | 月額 |
| --- | --- | --- |
| CloudFront | Standard Plan ($15) or 従量制 | ~$15 |
| S3 | ~50MB + transfer | ~$0.10 |
| API Gateway | HTTP API 5M req × $1/M | ~$5 |
| Lambda | 5M req + compute | ~$5-15 |
| Aurora Serverless v2 | 2-4 ACU ピーク、10GB storage | ~$200-350 |
| **合計** | | **~$225-385** |

Aurora の代替として Neon (外部接続) を使う場合:

| サービス | 詳細 | 月額 |
| --- | --- | --- |
| Lambda + API GW + CF + S3 | 上記合計 | ~$25-35 |
| Neon | Launch (compute + storage) | ~$30-50 |
| **合計** | | **~$55-85** |

### コスト比較まとめ

| 規模 | 構成 A (Deno + Neon) | 構成 B (AWS + Aurora) | 構成 B' (AWS + Neon) |
| --- | --- | --- | --- |
| 小規模 | **$0** | $120+ (Aurora) / $25 (RDS) | ~$0-5 |
| 中規模 | **$50-70** | $225-385 | $55-85 |

---

## 3. 技術スタックとの相性

### Hono

| 項目 | Deno Deploy | AWS Lambda |
| --- | --- | --- |
| アダプタ | 不要 (ネイティブ) | `@hono/aws-lambda` アダプタ必要 |
| ランタイム | Deno (Web Standard) | Node.js 22 (Deno は Docker 経由) |
| コールドスタート | なし (エッジで常時稼働) | ~200-500ms (Node.js + Hono は軽量) |
| ストリーミング | ネイティブ対応 | `streamHandle` で対応可能 |

### Drizzle ORM

| 項目 | Deno Deploy + Neon | AWS Lambda + Aurora |
| --- | --- | --- |
| ドライバ | `drizzle-orm/neon-http` (HTTP) | `drizzle-orm/node-postgres` (TCP) |
| 接続 | HTTP (ステートレス) | TCP (VPC 内、接続プーリング必要) |
| VPC 設定 | 不要 | 必要 (Lambda VPC + NAT or VPC Endpoint) |
| マイグレーション | Drizzle Kit (TCP) | Drizzle Kit (TCP) |

### React SPA

| 項目 | Deno Deploy | CloudFront + S3 |
| --- | --- | --- |
| 配信方式 | `serveStatic` (Hono) | S3 オリジン + CloudFront CDN |
| CDN | Deno Deploy エッジ (限定的) | CloudFront (グローバル、高機能) |
| キャッシュ制御 | 基本的 | 細かい制御可能 (TTL, invalidation) |
| カスタムドメイン | 対応 | Route53 + ACM で対応 |

---

## 4. 開発者体験 (DX)

| 観点 | Deno Deploy + Neon | AWS 全載せ |
| --- | --- | --- |
| 初期セットアップ | 数分 (ダッシュボード) | 数時間〜数日 (IaC 構築) |
| デプロイ | `git push` → 自動 | SST/CDK deploy (ビルド + アップロード) |
| IaC 必要性 | 不要 | 必須 (SST, CDK, SAM, Terraform 等) |
| ローカル開発 | `deno task dev` | `sst dev` or ローカルモック |
| ログ確認 | Deno Deploy ダッシュボード | CloudWatch Logs |
| サービス数管理 | 2 | 5+ |
| AWS 知識 | 不要 | IAM, VPC, CloudFormation 等の深い理解が必要 |
| CI/CD | GitHub Actions (OIDC) | GitHub Actions + AWS credentials |

---

## 5. 運用面

| 観点 | Deno Deploy + Neon | AWS 全載せ |
| --- | --- | --- |
| 東京リージョン | DB なし (Singapore) | 全サービス東京 |
| レイテンシ (日本) | API: 低、DB: +20-40ms | 全体的に低い |
| スケーラビリティ | 自動 (エッジ) | 自動 (Lambda + Aurora) |
| SLA | Deno Deploy: なし (Free/Pro) | 各サービスに SLA あり |
| 障害時の影響 | Deno Deploy 単一障害点 | サービスごとに独立 |
| セキュリティ | 基本的 | VPC, WAF, Security Group 等 |
| コンプライアンス | 限定的 | SOC2, HIPAA, PCI DSS 等 |

---

## 6. AWS に移行する場合の作業量

現在の Deno Deploy 構成から AWS に移行するために必要な作業:

| 作業 | 内容 | 工数 |
| --- | --- | --- |
| IaC 構築 | SST or CDK で Lambda, API GW, CloudFront, S3 定義 | 大 |
| Lambda アダプタ | Hono に `@hono/aws-lambda` を適用 | 小 |
| ランタイム変更 | Deno → Node.js (or Deno Docker on Lambda) | 中〜大 |
| DB ドライバ | `neon-http` → `node-postgres` (Aurora の場合) | 小 |
| VPC 設定 | Lambda + Aurora を VPC 内に配置 | 中 |
| SPA デプロイ | Vite build → S3 sync + CloudFront invalidation | 小 |
| CI/CD | GitHub Actions を AWS デプロイ用に書き直し | 中 |
| 環境変数 | Deno Deploy → AWS Systems Manager or Secrets Manager | 小 |
| ドメイン/SSL | Route53 + ACM 設定 | 小 |

最大の障壁は **Deno → Node.js のランタイム変更**。
Hono と Drizzle は Node.js でも動作するが、Deno 固有の API (`Deno.env`, `Deno.serve` 等)
を使っている箇所の書き換えが必要。`@std/*` の Deno 標準ライブラリも npm 互換に置換が必要。

---

## 7. ハイブリッド構成の選択肢

### 構成 C: AWS Lambda + Neon (DB は外部)

```text
ユーザー → CloudFront
             ├─ /api/*  → API Gateway → Lambda (Hono) → Neon (Singapore)
             └─ /*      → S3
```

AWS のコンピュート + Neon の DB を組み合わせる折衷案。

| メリット | デメリット |
| --- | --- |
| Lambda の東京リージョン | Neon は Singapore (DB レイテンシ残る) |
| VPC 設定不要 (HTTP 接続) | AWS インフラの管理コスト |
| Aurora より安い | ランタイム変更は必要 |
| CloudFront の CDN 品質 | IaC 構築が必要 |

### 構成 D: Deno Deploy + Aurora Serverless v2 (DB は AWS)

```text
ユーザー → Deno Deploy (エッジ)
             ├─ /api/*  → Hono API → Aurora Serverless v2 (Tokyo)
             └─ /*      → SPA
```

| メリット | デメリット |
| --- | --- |
| Deno Deploy の DX を維持 | Aurora の東京 → Deno Deploy エッジ間のレイテンシ |
| 東京リージョンの DB | Aurora の最低 $43/月 (0.5 ACU) |
| ランタイム変更不要 | VPC 外からのアクセス設定 (パブリック or プロキシ) |

---

## 8. 総合評価

### コスト面の結論

| 規模 | 最安構成 | 理由 |
| --- | --- | --- |
| PoC / 個人開発 | **Deno Deploy + Neon (構成 A)** | $0 で始められる。AWS は Aurora だけで $43+/月 |
| スタートアップ初期 | **Deno Deploy + Neon (構成 A)** | $50-70/月。AWS 全載せは 3-5x 高い |
| 成長期 (日本向け) | **AWS Lambda + Neon (構成 C)** | 東京コンピュート + 安い DB |
| 本番 (低レイテンシ必須) | **AWS 全載せ (構成 B)** | 全サービス東京。ただし月 $200+ |

### "AWS のほうが安い" は本当か

**小〜中規模では Deno Deploy + Neon のほうが圧倒的に安い。**

AWS が安くなるのは以下の条件が揃った場合:
- Aurora Serverless v2 の scale-to-zero (0 ACU) を活用できる (15秒のコールドスタート許容)
- Lambda Free Tier (月 1M リクエスト) の範囲内
- CloudFront Free Plan ($0) の範囲内
- RDS t4g.micro ($25/月) で十分な DB サイズ

**実際に安くなるシナリオ:**
Aurora の代わりに Neon を外部 DB として使う「構成 C」なら、
コンピュート部分 (Lambda + API GW) はほぼ無料、DB は Neon Free Tier で $0。
ただし **ランタイムを Deno → Node.js に変更する移行コスト** が発生する。

### 推奨判断フロー

```text
東京リージョン必須?
  ├─ No → 構成 A (Deno Deploy + Neon) で十分
  └─ Yes
       ├─ DB レイテンシが最優先?
       │    ├─ Yes → 構成 B (AWS 全載せ + Aurora)。月 $200+ 覚悟
       │    └─ No → 構成 C (AWS Lambda + Neon Singapore)
       └─ DX と開発速度が最優先?
            └─ 構成 A のまま。Neon の東京リージョン対応を待つ
```

### 現時点の推奨: 構成 A を継続

| 理由 | 詳細 |
| --- | --- |
| コスト | $0 で開始、中規模でも $50-70/月 |
| DX | IaC 不要、`git push` でデプロイ |
| 移行コスト | Deno → Node.js の書き換えは非自明 |
| 将来性 | Neon の東京リージョン追加の可能性 |
| 段階的移行 | 必要になった時点で構成 C に段階移行可能 |

AWS への完全移行は **東京リージョンの低レイテンシが事業要件として確定した時点** で検討すればよい。
その際も DB は Neon のまま (構成 C) が最もコスパが良い。

---

## 参考リンク

- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [AWS Aurora Pricing](https://aws.amazon.com/rds/aurora/pricing/)
- [API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/)
- [CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Deno Deploy Pricing](https://deno.com/deploy/pricing)
- [Neon Pricing](https://neon.com/pricing)
- [Neon vs Aurora コスト比較 (Vantage)](https://www.vantage.sh/blog/neon-vs-aws-aurora-serverless-postgres-cost-scale-to-zero)
- [Aurora Serverless v2 Scale to Zero](https://aws.amazon.com/blogs/database/introducing-scaling-to-0-capacity-with-amazon-aurora-serverless-v2/)
- [Hono on AWS Lambda](https://hono.dev/docs/getting-started/aws-lambda)
- [SST + Hono + Drizzle](https://sst.dev/docs/start/aws/hono/)
- [Deno on AWS Lambda](https://docs.deno.com/examples/deploy_deno_to_aws_lambda/)
