SHELL := /bin/sh

.PHONY: help build-web deploy-preview deploy-prod

help:
	@echo "Available targets:"
	@echo "  make build-web        # Build SPA into packages/api/dist"
	@echo "  make deploy-preview   # Deploy preview revision to Deno Deploy"
	@echo "  make deploy-prod      # Deploy production revision to Deno Deploy"

build-web:
	@deno task build:web

deploy-preview:
	@set -eu; \
	if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	test -n "$${DENO_DEPLOY_TOKEN:-}" || { echo "Missing DENO_DEPLOY_TOKEN (.env or env)"; exit 1; }; \
	test -n "$${DENO_DEPLOY_APP:-}" || { echo "Missing DENO_DEPLOY_APP (.env or env)"; exit 1; }; \
	VITE_API_URL= deno task build:web; \
	DEPLOY_SOURCE_DIR="$$(mktemp -d)"; \
	trap 'rm -rf "$$DEPLOY_SOURCE_DIR"' EXIT INT TERM; \
	mkdir -p "$$DEPLOY_SOURCE_DIR/packages"; \
	cp -R packages/api "$$DEPLOY_SOURCE_DIR/packages/api"; \
	rm -rf "$$DEPLOY_SOURCE_DIR/packages/api/node_modules"; \
	test -f "$$DEPLOY_SOURCE_DIR/packages/api/generated/prisma/client.ts"; \
	test -f "$$DEPLOY_SOURCE_DIR/packages/api/dist/index.html"; \
	if [ -n "$${DENO_DEPLOY_ORG:-}" ]; then \
		deno deploy \
			--config "$$DEPLOY_SOURCE_DIR/packages/api/deno.json" \
			--token "$$DENO_DEPLOY_TOKEN" \
			--org "$$DENO_DEPLOY_ORG" \
			--app "$$DENO_DEPLOY_APP" \
			"$$DEPLOY_SOURCE_DIR"; \
	else \
		deno deploy \
			--config "$$DEPLOY_SOURCE_DIR/packages/api/deno.json" \
			--token "$$DENO_DEPLOY_TOKEN" \
			--app "$$DENO_DEPLOY_APP" \
			"$$DEPLOY_SOURCE_DIR"; \
	fi

deploy-prod:
	@set -eu; \
	if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	test -n "$${DENO_DEPLOY_TOKEN:-}" || { echo "Missing DENO_DEPLOY_TOKEN (.env or env)"; exit 1; }; \
	test -n "$${DENO_DEPLOY_APP:-}" || { echo "Missing DENO_DEPLOY_APP (.env or env)"; exit 1; }; \
	VITE_API_URL= deno task build:web; \
	DEPLOY_SOURCE_DIR="$$(mktemp -d)"; \
	trap 'rm -rf "$$DEPLOY_SOURCE_DIR"' EXIT INT TERM; \
	mkdir -p "$$DEPLOY_SOURCE_DIR/packages"; \
	cp -R packages/api "$$DEPLOY_SOURCE_DIR/packages/api"; \
	rm -rf "$$DEPLOY_SOURCE_DIR/packages/api/node_modules"; \
	test -f "$$DEPLOY_SOURCE_DIR/packages/api/generated/prisma/client.ts"; \
	test -f "$$DEPLOY_SOURCE_DIR/packages/api/dist/index.html"; \
	if [ -n "$${DENO_DEPLOY_ORG:-}" ]; then \
		deno deploy \
			--config "$$DEPLOY_SOURCE_DIR/packages/api/deno.json" \
			--token "$$DENO_DEPLOY_TOKEN" \
			--org "$$DENO_DEPLOY_ORG" \
			--app "$$DENO_DEPLOY_APP" \
			--prod \
			"$$DEPLOY_SOURCE_DIR"; \
	else \
		deno deploy \
			--config "$$DEPLOY_SOURCE_DIR/packages/api/deno.json" \
			--token "$$DENO_DEPLOY_TOKEN" \
			--app "$$DENO_DEPLOY_APP" \
			--prod \
			"$$DEPLOY_SOURCE_DIR"; \
	fi
