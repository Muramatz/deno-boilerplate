# Deno Full-Stack Monorepo Boilerplate

<p align="center">
  <img src="https://deno.land/logo.svg" alt="Deno" height="48" />
  &nbsp;&nbsp;
  <img src="https://hono.dev/images/logo.svg" alt="Hono" height="48" />
  &nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/prisma/presskit/main/Assets/Prisma-LightSymbol.svg" />
    <img src="https://raw.githubusercontent.com/prisma/presskit/main/Assets/Prisma-DarkSymbol.svg" alt="Prisma" height="48" />
  </picture>
  &nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" height="48" />
  &nbsp;&nbsp;
  <img src="https://vitejs.dev/logo.svg" alt="Vite" height="48" />
  &nbsp;&nbsp;
  <img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" alt="Tailwind CSS" height="48" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Deno-2.7%2B-000?logo=deno" alt="Deno" />
  <img src="https://img.shields.io/badge/Hono-4-E36002?logo=hono" alt="Hono" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Zod-4-3E67B1?logo=zod" alt="Zod" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma%20Postgres-2D3748?logo=prisma" alt="Prisma Postgres" />
  <img src="https://img.shields.io/badge/Deploy-Deno%20Deploy-000?logo=deno" alt="Deno Deploy" />
</p>

TypeScript monorepo boilerplate for building full-stack web apps with **Deno**.
API and SPA are deployed as a single unit to **Deno Deploy** — zero-config, edge-native.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Runtime** | [Deno](https://deno.com/) 2.7+ | TypeScript-first runtime with built-in tooling |
| **API** | [Hono](https://hono.dev/) + [Zod OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) | Lightweight web framework with auto-generated OpenAPI docs |
| **Validation** | [Zod](https://zod.dev/) v4 | Schema-first validation shared between API & frontend |
| **ORM** | [Prisma](https://www.prisma.io/) 7 | Type-safe ORM with pure TypeScript engine |
| **Database** | [Prisma Postgres](https://www.prisma.io/postgres) | Serverless Postgres with global caching |
| **Frontend** | [React](https://react.dev/) 19 + [Vite](https://vite.dev/) 7 | Modern SPA with HMR |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4 | Utility-first CSS |
| **Server State** | [TanStack Query](https://tanstack.com/query) v5 | Async state management with caching |
| **Client State** | [Zustand](https://zustand.docs.pmnd.rs/) | Minimal global state |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + Zod resolver | Performant forms with schema validation |
| **Testing** | Deno Test + PGlite | In-memory PostgreSQL-compatible test DB (no Docker in CI) |
| **Deploy** | [Deno Deploy](https://deno.com/deploy) | Edge-native hosting via GitHub Actions + `deno deploy` |

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            Deno Deploy (Production)     │
                    │                                         │
  Browser  ─────────┤  /api/*  → Hono API → Prisma Postgres   │
                    │  /*      → Vite SPA (static files)      │
                    └─────────────────────────────────────────┘

  Development:
    localhost:5173 (Vite)  ──proxy /api──→  localhost:3000 (Hono)
                                                  ↓
                                           Docker PostgreSQL
```

**API-First Design** — Zod schemas are defined once in the API and shared with the frontend via workspace subpath exports (`@app/api/schemas`). Hono's RPC client (`hc<AppType>`) provides end-to-end type safety with IDE autocomplete.

## Project Structure

```
├── deno.json                 # Workspace root config
├── compose.yml               # Local PostgreSQL (Docker)
├── .github/workflows/
│   ├── ci.yml                # PR checks (lint, typecheck, test, build)
│   └── deploy.yml            # Auto-deploy on push to main
├── packages/
│   ├── api/                  # @app/api — Hono backend
│   │   └── src/
│   │       ├── features/     # Feature modules (routes/service/repository)
│   │       ├── db/           # Prisma Client connection & DI
│   │       ├── middleware/    # Logger, error handler, CORS
│   │       ├── schemas/      # Re-exports for frontend consumption
│   │       └── app.ts        # Hono app + SPA serving (production)
│   └── web/                  # @app/web — React frontend
│       └── src/
│           ├── app/          # Providers, router, routes
│           ├── features/     # Feature modules (api/components)
│           ├── lib/          # Hono RPC client, TanStack Query
│           └── components/   # Shared UI components
└── .vscode/                  # Optional shared editor settings
```

### API Feature Structure

Each feature follows a 3-layer architecture:

```
features/<name>/
├── schema.ts       # Pure Zod schemas (shared with frontend)
├── openapi.ts      # Zod schemas + OpenAPI metadata
├── repository.ts   # Data access (Prisma Client CRUD)
├── service.ts      # Business logic (throws AppError)
├── routes.ts       # HTTP handlers (OpenAPIHono)
└── __tests__/      # Unit & integration tests
```

---

## Getting Started

### Prerequisites

- [Deno](https://docs.deno.com/runtime/getting_started/installation/) 2.7+
- [Docker](https://docs.docker.com/get-docker/) (for local PostgreSQL)

### 1. Fork & Clone

```bash
# Fork this repo on GitHub, then:
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Install Dependencies

```bash
deno install
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 4. Start Database

```bash
docker compose up -d
```

### 5. Run Migrations

```bash
deno task --filter '@app/api' db:migrate
```

### 6. Start Development

```bash
deno task dev
```

This starts both servers in parallel:

- **API**: <http://localhost:3000> (with `--watch`)
- **Web**: <http://localhost:5173> (Vite HMR)
- **Swagger UI**: <http://localhost:3000/api/swagger> (dev only)

---

## Commands

| Command | Description |
|---------|-------------|
| `deno task dev` | Start API + Web in parallel |
| `deno task dev:api` | API only (port 3000) |
| `deno task dev:web` | Web only (port 5173) |
| `deno task test` | Run API tests |
| `deno task --filter '@app/web' test` | Run Web tests |
| `deno lint` | Lint all packages |
| `deno fmt` | Format all files |
| `deno task --filter '@app/api' check` | Type-check API |
| `deno task --filter '@app/web' check` | Type-check Web |
| `deno task --filter '@app/api' db:generate` | Generate Prisma Client |
| `deno task --filter '@app/api' db:migrate` | Create & apply migrations |
| `deno task --filter '@app/api' db:push` | Push schema to dev DB |
| `deno task --filter '@app/api' db:push:test` | Push schema to DB specified by `TEST_DATABASE_URL` |
| `deno task --filter '@app/api' db:studio` | Open Prisma Studio |
| `deno task build:web` | Build SPA for production |
| `deno task deploy:preview` | Preview production build locally |

---

## Customizing for Your App

After forking, follow these steps to make it your own:

### 1. Rename the Project

Update the following files:

- `compose.yml` — change `container_name` and `POSTGRES_DB`
- `packages/api/src/app.ts` — change the OpenAPI `title`
- `.env.example` — update `DATABASE_URL` database name
- `deno.json` — update any references as needed

### 2. Remove the Example Feature

Delete the example feature and create your own:

```bash
rm -rf packages/api/src/features/example
rm -rf packages/web/src/features/example
```

Then update:

- `packages/api/src/app.ts` — remove example route registration
- `packages/api/prisma/schema.prisma` — remove example model
- `packages/api/src/schemas/index.ts` — remove example exports
- `packages/web/src/app/router.tsx` — remove example route

### 3. Create Your First Feature

Follow the 3-layer pattern:

```bash
mkdir -p packages/api/src/features/todo
```

Create files in this order:

1. Add model to `prisma/schema.prisma` and run `db:generate`
2. `schema.ts` — Zod validation schemas
3. `openapi.ts` — OpenAPI-enhanced schemas
4. `repository.ts` — Database operations
5. `service.ts` — Business logic
6. `routes.ts` — HTTP route handlers
7. `index.ts` — Public exports

Register the route in `app.ts`:

```typescript
.route('/api/todo', todoRoutes)
```

---

## Deploying to Deno Deploy

This boilerplate uses a **single deployment model**: the Hono API serves both `/api/*` routes and the Vite SPA build output from a single entrypoint.

### 1. Create Prisma Postgres Database

1. Sign up at [prisma.io/postgres](https://www.prisma.io/postgres)
2. Create a project and copy the connection string
3. Run migrations against Prisma Postgres:

   ```bash
   DATABASE_URL="prisma+postgres://..." deno task --filter '@app/api' db:deploy
   ```

### 2. Set Up Deno Deploy

1. Go to [dash.deno.com](https://dash.deno.com/) and create a new project
2. Link your GitHub repository
3. Set environment variables in the Deno Deploy dashboard:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `prisma+postgres://accelerate.prisma-data.net/?api_key=...` |
   | `DENO_ENV` | `production` |
   | `JWT_SECRET` | Random secure string |

### 3. Configure GitHub Actions

1. In your GitHub repo, go to **Settings > Secrets and variables > Actions > Secrets**
2. Add `DENO_DEPLOY_TOKEN` (create it in **console.deno.com**)
3. Add `DATABASE_URL` for production migrations (same value as your production DB connection string)
4. In **Settings > Secrets and variables > Actions > Variables**, add:
   - `DENO_DEPLOY_APP` with your Deno Deploy app name
   - Optional: `DENO_DEPLOY_ORG` if your app is under an organization

If deploy fails with an app/project permission error:

- Confirm the token owner has access to that app
- Confirm `DENO_DEPLOY_APP` is correct
- Confirm `DENO_DEPLOY_ORG` is correct (or unset for personal apps)
- Confirm `DATABASE_URL` secret is set and points to the production database

The CI/CD pipeline will automatically:

- **On PR**: Run lint, format check, type check, tests, and build
- **On push to `main`**: Run all checks, run `prisma migrate deploy`, then deploy to Deno Deploy
- **Manual run (`workflow_dispatch`)**: Available from GitHub Actions (users with repository write access)
- Security audit gate: fails only on `critical` advisories (`deno audit --level=critical`)

### 4. Verify Deployment

After the first deploy:

```
https://<project>.deno.dev/              → SPA
https://<project>.deno.dev/api/health    → {"status":"ok"}
https://<project>.deno.dev/api/swagger   → (disabled in production)
```

### Local Production Preview

Test the production build locally before deploying:

```bash
deno task build:web
deno task deploy:preview
# Open http://localhost:3000
```

---

## Testing

- **API tests** use **PGlite** via `scripts/test-with-pglite.ts` (no Docker required in CI)
- **Web tests** use **MSW** for API mocking and **Testing Library** for component testing
- BDD style: `describe` / `it` with `@std/testing/bdd` and `@std/expect`

```bash
# Run all API tests
deno task test

# Run a specific test file
deno task --filter '@app/api' test src/features/example/__tests__/repository.test.ts
```

---

## Code Conventions

| Rule | Convention |
|------|-----------|
| Imports | Always include `.ts` / `.tsx` extensions |
| Formatting | Semicolons, single quotes, 2-space indent, 100-char width |
| Directories | `kebab-case` |
| Functions/Variables | `camelCase` |
| Types/Components | `PascalCase` |
| Prisma dates | `DateTime @db.Date` (repository converts to YYYY-MM-DD string) |
| Prisma timestamps | `DateTime @default(now())` with `@db.Timestamptz` |
| Error handling | Custom `AppError` classes (`NotFoundError`, `ConflictError`, `ValidationError`) |

---

## License

MIT
