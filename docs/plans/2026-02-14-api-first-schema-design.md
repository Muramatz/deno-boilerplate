# API-First スキーマ設計: shared パッケージ廃止 & フロントエンド Zod バリデーション

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** shared パッケージを廃止し、API feature 内の Zod スキーマを Single Source of Truth
にして、Web 側に react-hook-form + Zod バリデーションを導入する。

**Architecture:** API の各 feature 内に `schema.ts`(pure Zod）を新設し、`openapi.ts`
はそのラッパーとする。既存の Drizzle テーブル定義 `schema.ts` は `table.ts` にリネーム。Web は
`@app/api/schemas` サブパスエクスポートから Zod スキーマを import し、react-hook-form の zodResolver
で使用する。

**Tech Stack:** Zod v4, @hono/zod-openapi v1.x, react-hook-form v7, @hookform/resolvers v5, Drizzle
ORM, Deno workspace

---

## Task 1: API — Drizzle テーブルファイルのリネーム (schema.ts → table.ts)

**Files:**

- Rename: `packages/api/src/features/example/schema.ts` → `table.ts`
- Rename: `packages/api/src/db/schema.ts` → `tables.ts`
- Modify: `packages/api/src/features/example/repository.ts`
- Modify: `packages/api/src/features/example/routes.ts`
- Modify: `packages/api/src/features/example/index.ts`
- Modify: `packages/api/src/db/index.ts`
- Modify: `packages/api/src/test/setup.ts`
- Modify: `packages/api/drizzle.config.ts`

**Step 1: リネーム実行**

```bash
mv packages/api/src/features/example/schema.ts packages/api/src/features/example/table.ts
mv packages/api/src/db/schema.ts packages/api/src/db/tables.ts
```

**Step 2: feature 内の import パス修正**

`repository.ts` — `./schema.ts` → `./table.ts`:

```typescript
import { type ExampleRecord, examples, type NewExampleRecord } from './table.ts';
```

`routes.ts` — `./schema.ts` → `./table.ts`:

```typescript
import type { ExampleRecord } from './table.ts';
```

`index.ts`:

```typescript
export { exampleRoutes } from './routes.ts';
export { examples } from './table.ts';
```

**Step 3: db/ 内の import パス修正**

`db/index.ts` — `./schema.ts` → `./tables.ts`:

```typescript
import * as schema from './tables.ts';
```

`db/tables.ts` — 内部パス修正:

```typescript
export { examples } from '../features/example/table.ts';
```

`test/setup.ts` — `@/db/schema.ts` → `@/db/tables.ts`:

```typescript
const schema = await import('@/db/tables.ts');
// (2箇所: initTestDb 内と cleanupTables 内)
```

`drizzle.config.ts`:

```typescript
schema: './src/db/tables.ts',
```

**Step 4: テスト実行**

```bash
deno task --filter '@app/api' test
```

Expected: 全テスト PASS（リネームのみなのでロジック変更なし）

**Step 5: コミット**

```bash
git add packages/api/
git commit -m "refactor(api): rename Drizzle schema.ts to table.ts for clarity"
```

---

## Task 2: API — Zod バリデーションスキーマ作成 + 定数移動

**Files:**

- Create: `packages/api/src/features/example/schema.ts`
- Create: `packages/api/src/features/example/constants.ts`
- Modify: `packages/api/src/features/example/service.ts`

**Step 1: schema.ts 作成 (pure Zod)**

`packages/api/src/features/example/schema.ts`:

```typescript
import { z } from 'zod';

// ベーススキーマ
export const baseExampleSchema = z.object({
  field1: z.boolean().default(false),
  field2: z.string(),
});

// 作成スキーマ（ベース + 追加フィールド）
export const createExampleSchema = baseExampleSchema.extend({
  date: z.string().date(),
});
export type CreateExample = z.infer<typeof createExampleSchema>;

// 更新スキーマ（部分更新）
export const updateExampleSchema = baseExampleSchema.partial();
export type UpdateExample = z.infer<typeof updateExampleSchema>;

// レスポンススキーマ（メタデータ付き）
export const exampleSchema = baseExampleSchema.extend({
  id: z.uuid(),
  date: z.string().date(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Example = z.infer<typeof exampleSchema>;
```

**Step 2: constants.ts 作成 (shared から移動)**

`packages/api/src/features/example/constants.ts`:

```typescript
export const EXAMPLE_STATUSES = [
  { id: 'active', label: '有効', order: 1 },
  { id: 'inactive', label: '無効', order: 2 },
  { id: 'archived', label: 'アーカイブ', order: 3 },
] as const;

export type ExampleStatusId = (typeof EXAMPLE_STATUSES)[number]['id'];
export const EXAMPLE_STATUS_IDS = EXAMPLE_STATUSES.map((s) => s.id);
```

**Step 3: service.ts の import 修正**

`@app/shared` → `./schema.ts`:

```typescript
import type { CreateExample } from './schema.ts';
```

**Step 4: テスト実行**

```bash
deno task --filter '@app/api' test
```

Expected: 全テスト PASS

**Step 5: コミット**

```bash
git add packages/api/src/features/example/schema.ts packages/api/src/features/example/constants.ts packages/api/src/features/example/service.ts
git commit -m "feat(api): add Zod validation schemas and constants to example feature"
```

---

## Task 3: API — schemas サブパスエクスポート作成

**Files:**

- Create: `packages/api/src/schemas/index.ts`
- Modify: `packages/api/deno.json`

**Step 1: schemas/index.ts 作成**

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

**Step 2: deno.json にサブパスエクスポート追加**

`packages/api/deno.json` の `exports` を変更:

```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas/index.ts"
},
```

**Step 3: コミット**

```bash
git add packages/api/src/schemas/ packages/api/deno.json
git commit -m "feat(api): add schemas subpath export for web consumption"
```

---

## Task 4: shared パッケージ削除 + ルート設定更新

**Files:**

- Delete: `packages/shared/` (全ファイル)
- Modify: ルート `deno.json`

**Step 1: shared ディレクトリ削除**

```bash
rm -rf packages/shared
```

**Step 2: ルート deno.json の workspace から shared 除去**

`workspace` を変更:

```json
"workspace": [
  "./packages/api",
  "./packages/web"
],
```

ルートの `tasks.test` から shared テスト除去:

```json
"test": "deno task --filter '@app/api' test",
```

**Step 3: deno install で依存解決確認**

```bash
deno install
```

**Step 4: API テスト実行**

```bash
deno task --filter '@app/api' test
```

Expected: 全テスト PASS

**Step 5: lint + fmt 確認**

```bash
deno lint && deno fmt --check
```

**Step 6: コミット**

```bash
git add -A
git commit -m "refactor: remove shared package, API is now the single source of truth"
```

---

## Task 5: Web — create-form.tsx に react-hook-form + Zod バリデーション導入

**Files:**

- Modify: `packages/web/src/features/example/components/create-form.tsx`

**Step 1: create-form.tsx を書き換え**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateExample, createExampleSchema } from '@app/api/schemas';
import { useCreateExample } from '../api/mutations.ts';

export type ExampleData = {
  id: string;
  date: string;
  field1: boolean;
  field2: string;
  createdAt: string;
  updatedAt: string;
};

function todayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function CreateForm({ onCreated }: { onCreated: (data: ExampleData) => void }) {
  const createMutation = useCreateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateExample>({
    resolver: zodResolver(createExampleSchema),
    defaultValues: { date: todayString(), field1: false, field2: '' },
  });

  const field1Value = watch('field1');

  const onSubmit = (data: CreateExample) => {
    createMutation.mutate(data, {
      onSuccess: (res) => {
        onCreated(res as ExampleData);
        reset({ date: todayString(), field1: false, field2: '' });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Create Example</h2>
      <div>
        <label className='block text-sm text-gray-600'>Date</label>
        <input
          type='date'
          {...register('date')}
          className='w-full rounded border px-3 py-1.5'
        />
        {errors.date && <p className='mt-1 text-sm text-red-600'>{errors.date.message}</p>}
      </div>
      <div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={field1Value}
            onChange={(e) => setValue('field1', e.target.checked)}
          />
          Field1
        </label>
      </div>
      <div>
        <label className='block text-sm text-gray-600'>Field2</label>
        <input
          type='text'
          {...register('field2')}
          className='w-full rounded border px-3 py-1.5'
          placeholder='Enter text...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-red-600'>{errors.field2.message}</p>}
      </div>
      <button
        type='submit'
        disabled={createMutation.isPending}
        className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50'
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
      {createMutation.isError && (
        <p className='text-sm text-red-600'>{createMutation.error.message}</p>
      )}
    </form>
  );
}
```

**Step 2: 型チェック**

```bash
deno task --filter '@app/web' check
```

Expected: エラーなし（`@app/api/schemas` サブパスが解決できること）

**Step 3: コミット**

```bash
git add packages/web/src/features/example/components/create-form.tsx
git commit -m "feat(web): add Zod validation to CreateForm with react-hook-form"
```

---

## Task 6: Web — update-form.tsx に react-hook-form + Zod バリデーション導入

**Files:**

- Modify: `packages/web/src/features/example/components/update-form.tsx`

**Step 1: update-form.tsx を書き換え**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type UpdateExample, updateExampleSchema } from '@app/api/schemas';
import { useUpdateExample } from '../api/mutations.ts';

export function UpdateForm({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const updateMutation = useUpdateExample();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateExample>({
    resolver: zodResolver(updateExampleSchema),
    defaultValues: { field1: undefined, field2: undefined },
  });

  const field1Value = watch('field1');

  const onSubmit = (data: UpdateExample) => {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-3 rounded border p-4'>
      <h2 className='text-lg font-semibold'>Update Example</h2>
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
        <label className='block text-sm text-gray-600'>Field2</label>
        <input
          type='text'
          {...register('field2')}
          className='w-full rounded border px-3 py-1.5'
          placeholder='New value...'
        />
        {errors.field2 && <p className='mt-1 text-sm text-red-600'>{errors.field2.message}</p>}
      </div>
      <button
        type='submit'
        disabled={updateMutation.isPending}
        className='rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50'
      >
        {updateMutation.isPending ? 'Updating...' : 'Update'}
      </button>
      {updateMutation.isError && (
        <p className='text-sm text-red-600'>{updateMutation.error.message}</p>
      )}
    </form>
  );
}
```

**Step 2: 型チェック**

```bash
deno task --filter '@app/web' check
```

**Step 3: コミット**

```bash
git add packages/web/src/features/example/components/update-form.tsx
git commit -m "feat(web): add Zod validation to UpdateForm with react-hook-form"
```

---

## Task 7: 全体検証

**Step 1: lint + fmt**

```bash
deno lint && deno fmt --check
```

**Step 2: API テスト**

```bash
deno task --filter '@app/api' test
```

**Step 3: Web ビルド**

```bash
cd packages/web && deno run -A npm:vite build
```

**Step 4: 問題があれば修正してコミット**

---

## 注意事項

### openapi.ts と schema.ts の関係

openapi.ts は既存のまま維持する（`@hono/zod-openapi` の `z` で直接定義）。schema.ts は純粋な `zod`
で定義し、Web 向けにエクスポートする。両者は同じフィールド構造を持つが、openapi.ts は OpenAPI
ドキュメント用メタデータ（description, example）を含む。

TypeScript がスキーマの乖離を検出する仕組み:

```
routes.ts: c.req.valid('json')  → openapi.ts の型
routes.ts: ExampleService.create(data) → schema.ts の CreateExample 型
→ 型が一致しなければコンパイルエラー
```

### `@hookform/resolvers` のバージョン

Web の deno.json には `"@hookform/resolvers": "npm:@hookform/resolvers@^5.2"` が入っている。v5.x は
`@hookform/resolvers/zod` でインポートする。
