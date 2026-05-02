.PHONY: up down recreate clean test test-watch test-coverage format format-check typecheck

COMPOSE ?= docker compose

# ── Docker ────────────────────────────────────────────────────────────────────

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

recreate:
	$(COMPOSE) up --build --force-recreate

clean:
	$(COMPOSE) down --volumes --rmi local --remove-orphans

# ── Dev ───────────────────────────────────────────────────────────────────────

## Run unit tests once
test:
	npm run test

## Run unit tests in watch mode
test-watch:
	npm run test:watch

## Run unit tests with coverage report
test-coverage:
	npm run test:coverage

## Format all source files with Prettier
format:
	npm run format

## Check formatting without writing changes (useful in CI)
format-check:
	npm run format:check

## Type-check without emitting files
typecheck:
	npm run typecheck
