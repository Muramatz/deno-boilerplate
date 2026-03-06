# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Deno 2.6+ monorepo boilerplate with API-first design. Two workspace members under `packages/`:

- **@app/api** — Hono + Prisma ORM 7 + Zod v4 + OpenAPI (Prisma Postgres / local PostgreSQL)
- **@app/web** — React 19 + Vite 7 + TanStack Query + Tailwind CSS v4

Deploy target: **Deno Deploy**. DB: **Prisma Postgres** (serverless PostgreSQL). Blueprint doc
(Japanese): `docs/deno-boilerplate-blueprint.md`

## Commands

```bash
# Development
deno task dev          # Run API + Web in parallel
deno task dev:api      # API only (port 3000, --watch)
deno task dev:web      # Web only (Vite, port 5173)

# Testing
deno task test                              # API tests (root shortcut)
deno task --filter '@app/api' test          # API tests
deno task --filter '@app/web' test          # Web tests

# Lint & Format
deno lint
deno fmt
deno fmt --check

# Type Check
deno task --filter '@app/api' check
deno task --filter '@app/web' check

# Database (local: PostgreSQL via compose.yml, production: Prisma Postgres)
deno task --filter '@app/api' db:generate   # Generate Prisma Client
deno task --filter '@app/api' db:migrate    # Create & apply migrations
deno task --filter '@app/api' db:deploy     # Apply pending migrations (CI/prod)
deno task --filter '@app/api' db:push       # Push schema to dev DB (.env)
deno task --filter '@app/api' db:push:test  # Push schema to DB from TEST_DATABASE_URL
deno task --filter '@app/api' db:studio     # Prisma Studio

# Build
deno task --filter '@app/web' build

# Deploy
deno task build:web              # Build web (required before deploy)
deno task deploy:preview         # Local production preview (http://localhost:3000)
```

To run a single test file:
`deno test --allow-net --allow-env --allow-read --allow-write --allow-sys --allow-ffi packages/api/src/features/example/__tests__/repository.test.ts`

## Architecture

### API Feature Structure (3-layer)

Each feature in `packages/api/src/features/<name>/` follows:

```
schema.ts      → Pure Zod validation schemas (shared via @app/api/schemas export)
openapi.ts     → Zod schemas with OpenAPI metadata + response formatting
repository.ts  → Data access layer (Prisma Client CRUD, returns null on not-found)
service.ts     → Business logic, validation, throws AppError subclasses
routes.ts      → OpenAPIHono route handlers, validates input, calls service
```

DB schema is defined in `packages/api/prisma/schema.prisma` (single source of truth). Import
direction: `routes → service → repository`, `openapi` uses `schema.ts`.

### Type-Safe Frontend ↔ Backend

The API exports its route types via `AppType` in `src/app.ts`. The web package consumes them with
Hono's RPC client (`hc<AppType>`) for fully type-safe API calls with IDE autocomplete.

Schemas are shared via the `@app/api/schemas` subpath export. The web package uses these Zod schemas
with react-hook-form + zodResolver.

### Web Feature Structure

```
features/<name>/
├── api/           → queries.ts (useQuery), mutations.ts (useMutation), types.ts (Hono InferRequestType/InferResponseType)
├── components/    → Feature-specific UI
└── index.ts
```

State: TanStack Query (server), Zustand (UI), react-hook-form (forms).

### Deploy (Deno Deploy)

Single deployment: API serves both `/api/*` routes (JSON) and Vite SPA build output (static files +
`index.html` fallback). In production (`DENO_ENV=production`), `serveStatic` from `hono/deno` serves
`packages/web/dist/`. CORS is disabled in production (same-origin). Entrypoint:
`packages/api/src/index.ts`.

### CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` — PR: lint, fmt, typecheck, test, build (parallel)
- `.github/workflows/deploy.yml` — Push to main: CI checks → deploy to Deno Deploy
- `prepare` job generates Prisma Client and includes `packages/api/generated` in artifact
- `test-api` job runs API tests on in-memory PGlite (no Docker service container)
- `deploy` job runs `prisma migrate deploy` before app deployment
- Auth: `deno deploy` token (`DENO_DEPLOY_TOKEN` GitHub Secret)
- Set GitHub repo variable `DENO_DEPLOY_APP` to your Deno Deploy app name (optional
  `DENO_DEPLOY_ORG`)
- Set GitHub repo secret `DATABASE_URL` for production migrations

## Key Conventions

- **All imports require `.ts`/`.tsx` extensions** — `import { foo } from './bar.ts'` not `'./bar'`
- **Formatting:** semicolons, single quotes, 2-space indent, 100-char line width
- **Directory naming:** kebab-case. **Code:** camelCase functions/vars, PascalCase types/components
- **Prisma dates:** `DateTime @db.Date` returns JS `Date` — repository converts to/from `YYYY-MM-DD`
  string via `toDate()`/`toRecord()` helpers
- **Prisma timestamps:** `DateTime @db.Timestamptz` with `@default(now())` and `@updatedAt`
- **Zod v4 specifics:** `z.iso.date()` replaces `z.string().date()`, `.partial()` preserves
  `.default()` values
- **Zod form types:** `z.input<typeof schema>` for react-hook-form (input type with defaults),
  `z.infer<typeof schema>` for output type
- **Error classes:** `AppError`, `NotFoundError`, `ConflictError`, `ValidationError` in
  `src/lib/errors.ts`
- **Prisma driver adapter:** `@prisma/adapter-pg` (TCP via `pg`) used in `src/db/index.ts`. For
  Prisma Postgres, set `DATABASE_URL` to `prisma+postgres://...` connection string
- **Prisma generated client:** Located at `packages/api/generated/prisma/` (gitignored). Run
  `db:generate` after schema changes

## Testing

- **Backend tests** run on PGlite via `scripts/test-with-pglite.ts` (in-memory, no Docker in CI)
- Test setup: `useTestDb()` helper creates Prisma client, injects via `setPrisma()`, truncates
  tables between tests, disconnects after
- `TEST_DATABASE_URL` env var (default: `postgresql://postgres:postgres@127.0.0.1:55432/postgres`)
- `deno task --filter '@app/api' test` starts PGlite and runs `prisma db push` automatically
- BDD style via `@std/testing/bdd` (`describe`, `it`) + `@std/expect`
- Service tests use mock repositories; route tests use `app.request()` (no HTTP server)
- **Frontend tests** use MSW for API mocking, `@testing-library/react`, jsdom

## Gotchas

- **`nodeModulesDir`** must be in root `deno.json`, not in member packages
- **`deno task --recursive`** also runs root tasks — causes infinite loops. Use `--filter` instead
- **`deno test packages/`** runs tests 3x (once per workspace member). Always use
  `deno task --filter '<pkg>' test`
- **Vite cannot resolve Deno workspace subpath exports** — requires explicit `resolve.alias` in
  `vite.config.ts`
- **React 19** ships no `.d.ts` types — `@types/react` is required separately
- **Deno + React JSX** needs both `"react/": "npm:/react@^19.2/"` subpath AND
  `"jsxImportSource": "react"` in compilerOptions
- **`@hono/zod-openapi@1.x`** requires Zod v4 as a peer dependency
- **Prisma `DateTime @db.Date`** returns JS `Date` objects, NOT strings. Repository layer must
  convert: input `toDate("2025-01-15")` → `new Date("2025-01-15T00:00:00.000Z")`, output
  `.toISOString().slice(0, 10)`
- **Prisma `prisma.config.ts`** requires `DATABASE_URL` at load time — even `prisma generate` needs
  it (use dummy value if no real DB available)
- **Prisma P2025 error** — thrown on update/delete of non-existent record. Catch and return
  `null`/`false` in repository layer
- **Prisma generated client** is gitignored — CI must run `prisma generate` in prepare step
- **`@std/dotenv/load`** safely no-ops on Deno Deploy (no `.env` file). Set env vars via the Deploy
  dashboard
- **`Deno.serve()` port/hostname** are ignored on Deno Deploy — the platform manages networking
- **Static file serving** (`serveStatic`) is production-only (`DENO_ENV=production`). In
  development, Vite dev server handles static files and proxies `/api` to the API
