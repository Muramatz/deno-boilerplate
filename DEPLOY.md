# Deno Deploy Runbook

This document defines the single deployment flow used in this repository.

## Dashboard Settings (Deno Deploy)

Use the following app settings:

- Preset: `No Preset`
- App Directory: `packages/api`
- Entrypoint: `src/index.ts`
- Install / Build / Pre-deploy command: none

## Repository Assumptions

- `deno task build:web` writes SPA assets to `packages/api/dist`
- API runtime serves static files from `./dist` in production
- GitHub Actions deploys a staged source directory, then runs:
  - `deno deploy --config <staged>/packages/api/deno.json ... <staged-root>`

## Local Commands

Run from repository root:

```bash
make deploy-preview
```

Production deploy:

```bash
make deploy-prod
```

`Makefile` behavior:

- Loads `.env` if present
- Requires `DENO_DEPLOY_TOKEN` and `DENO_DEPLOY_APP`
- Uses `DENO_DEPLOY_ORG` only when set
- Forces `VITE_API_URL` to empty during deploy build (same-origin `/api` on production)
- Builds web assets into `packages/api/dist`
- Creates a temporary staging directory and deploys from its parent

## Important Rules

- Running commands from repo root is valid.
- Do not pass `packages/api` as the deploy root path when App Directory is `packages/api`.
- Pass the parent directory of `packages/api` as deploy root (for example: staged root).
- If `DENO_DEPLOY_ORG` is wrong, deploy fails with organization access errors. For personal apps, leave it unset.

## 404 Checklist

1. `deno task build:web` created `packages/api/dist/index.html`
2. Deploy root path is parent of `packages/api`
3. Dashboard App Directory is exactly `packages/api`
4. Dashboard Entrypoint is exactly `src/index.ts`
