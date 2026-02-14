# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deno 2.6+ monorepo boilerplate with API-first design. Two workspace members under `packages/`:
- **@app/api** — Hono + Drizzle ORM + Zod v4 + OpenAPI (Neon PostgreSQL / local PostgreSQL)
- **@app/web** — React 19 + Vite 7 + TanStack Query + Tailwind CSS v4

Deploy target: **Deno Deploy**. DB: **Neon** (serverless PostgreSQL). Blueprint doc (Japanese): `docs/deno-boilerplate-blueprint.md`

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

# Database (local: PostgreSQL via compose.yml, production: Neon)
deno task --filter '@app/api' db:generate   # Create migrations
deno task --filter '@app/api' db:migrate    # Apply migrations
deno task --filter '@app/api' db:studio     # Drizzle Studio

# Build
deno task --filter '@app/web' build
```

To run a single test file: `deno test --allow-net --allow-env --allow-read --allow-write --allow-sys --allow-ffi packages/api/src/features/example/__tests__/repository.test.ts`

## Architecture

### API Feature Structure (3-layer)

Each feature in `packages/api/src/features/<name>/` follows:

```
table.ts       → Drizzle table definition (snake_case columns → camelCase TS)
schema.ts      → Pure Zod validation schemas (shared via @app/api/schemas export)
openapi.ts     → Zod schemas with OpenAPI metadata + response formatting
repository.ts  → Data access layer (Drizzle CRUD, returns null on not-found)
service.ts     → Business logic, validation, throws AppError subclasses
routes.ts      → OpenAPIHono route handlers, validates input, calls service
```

Import direction: `routes → service → repository → table`, `openapi` uses `schema.ts`.

### Type-Safe Frontend ↔ Backend

The API exports its route types via `AppType` in `src/app.ts`. The web package consumes them with Hono's RPC client (`hc<AppType>`) for fully type-safe API calls with IDE autocomplete.

Schemas are shared via the `@app/api/schemas` subpath export. The web package uses these Zod schemas with react-hook-form + zodResolver.

### Web Feature Structure

```
features/<name>/
├── api/           → queries.ts (useQuery), mutations.ts (useMutation), types.ts (Hono InferRequestType/InferResponseType)
├── components/    → Feature-specific UI
└── index.ts
```

State: TanStack Query (server), Zustand (UI), react-hook-form (forms).

## Key Conventions

- **All imports require `.ts`/`.tsx` extensions** — `import { foo } from './bar.ts'` not `'./bar'`
- **Formatting:** semicolons, single quotes, 2-space indent, 100-char line width
- **Directory naming:** kebab-case. **Code:** camelCase functions/vars, PascalCase types/components
- **Drizzle dates:** Use `mode: 'string'` (YYYY-MM-DD), not `mode: 'date'`
- **Drizzle timestamps:** `timestamp('col', { withTimezone: true })`
- **Zod v4 specifics:** `z.iso.date()` replaces `z.string().date()`, `.partial()` preserves `.default()` values
- **Zod form types:** `z.input<typeof schema>` for react-hook-form (input type with defaults), `z.infer<typeof schema>` for output type
- **Error classes:** `AppError`, `NotFoundError`, `ConflictError`, `ValidationError` in `src/lib/errors.ts`
- **DB driver switching:** `DATABASE_URL` containing `neon.tech` → `drizzle-orm/neon-http` (HTTP), otherwise → `drizzle-orm/postgres-js` (TCP). Auto-detected in `src/db/index.ts`

## Testing

- **Backend tests** use PGLite (in-memory PostgreSQL WASM) — no running DB needed
- Test setup: `useTestDb()` helper handles PGLite init, table cleanup between tests, and teardown
- BDD style via `@std/testing/bdd` (`describe`, `it`) + `@std/expect`
- Service tests use mock repositories; route tests use `app.request()` (no HTTP server)
- **Frontend tests** use MSW for API mocking, `@testing-library/react`, jsdom

## Gotchas

- **`nodeModulesDir`** must be in root `deno.json`, not in member packages
- **`deno task --recursive`** also runs root tasks — causes infinite loops. Use `--filter` instead
- **`deno test packages/`** runs tests 3x (once per workspace member). Always use `deno task --filter '<pkg>' test`
- **Vite cannot resolve Deno workspace subpath exports** — requires explicit `resolve.alias` in `vite.config.ts`
- **React 19** ships no `.d.ts` types — `@types/react` is required separately
- **Deno + React JSX** needs both `"react/": "npm:/react@^19.2/"` subpath AND `"jsxImportSource": "react"` in compilerOptions
- **drizzle-kit** runs on Node, can't resolve `@/` aliases — `drizzle.config.ts` uses relative paths
- **`@hono/zod-openapi@1.x`** requires Zod v4 as a peer dependency
- **Neon HTTP driver** is stateless (no connection pool) — ideal for Deno Deploy but `DATABASE_URL` must contain `neon.tech` for auto-detection
- **drizzle-kit migrations** always use postgres.js (TCP) regardless of runtime driver — point `DATABASE_URL` to Neon's standard connection string (not pooled) for production migrations
