# Retirement Planner

An interactive, visually-rich RRSP/RPP + TFSA retirement planner that runs anywhere via Docker. Adjust contribution cadence, annual income, expected market returns, inflation, and salary growth to instantly see your projected balance in both nominal and real dollars.

## Tech stack
- **React + TypeScript + Vite** for a fast, modern SPA experience
- **Tailwind CSS** for polished, responsive styling
- **Chart.js + react-chartjs-2** to visualize growth vs. contributions
- **lucide-react** iconography for subtle visual cues
- **Docker + Nginx** for a reproducible production-grade container image

## Features
- Configurable RRSP/RPP contribution frequency (weekly, bi-weekly, monthly)
- Annual income + contribution inputs only (no employer match assumption)
- Optional CRA RRSP room carry-forward input to align with your Notice of Assessment
- Market return, inflation, and salary growth levers with live recalculations
- Inflation-adjusted balances, safe withdrawal guideline, and growth insights with inline tooltips
- CRA RRSP limit check with real-time warning if annual deposits exceed the allowed room (18% of income, capped at the 2024 ceiling of $31,560)
- Per-frequency max-contribution strategy cards showing the exact deposit needed to fully use your RRSP room
- TFSA planner with its own contribution frequency, annual return slider, tax-free growth projections, and 2024 annual limit guardrail ($7,000)
- Combined projection chart plus individual RRSP and TFSA mini-charts
- Milestone table showing RRSP vs TFSA balances, combined totals, RRSP/TFSA percentage split, total contributions, and total growth at sampled ages
- Lifestyle snapshot section showing combined nest egg, inflation-adjusted purchasing power, sustainable withdrawal income (4% guideline), and compounding insights
- "Extra $100" insight showing how a small contribution increase compounds to retirement
- Fully client-side — your numbers never leave your machine

## Getting started (without Docker)
```sh
npm install
npm run dev
```
Then open http://localhost:5173

To create an optimized production build:
```sh
npm run build && npm run preview
```

## Run with Docker
Build and run the container (no local Node.js needed):
```sh
docker build -t retirement-planner .
docker run --rm -p 3000:80 retirement-planner
```
Navigate to http://localhost:3000

## docker-compose
```sh
docker compose up --build
```
This maps the app to http://localhost:3000 and restarts automatically unless stopped.

Docker Compose keeps the containers it previously created and simply restarts them on subsequent `up` runs, even when you pass `--build`. If you need a fresh container each time, either bring the stack down first or force recreation:

```sh
docker compose down        # stop + remove containers and network
docker compose up --build  # start from a clean slate
# or in one shot
docker compose up --build --force-recreate
```

To completely clean up everything (containers, anonymous volumes, and locally built images), run:

```sh
docker compose down --volumes --rmi local --remove-orphans
```

## Make targets
Common workflows are wrapped in the provided `Makefile`:

**Docker Compose**
```sh
make up        # docker compose up --build
make down      # docker compose down
make recreate  # docker compose up --build --force-recreate
make clean     # docker compose down --volumes --rmi local --remove-orphans
```

Override the compose binary by setting `COMPOSE="docker compose"` or `COMPOSE="docker-compose"` when needed (default is `docker compose`).

**Testing & code quality**
```sh
make test            # run unit tests once
make test-watch      # run unit tests in watch mode
make test-coverage   # run unit tests and generate a coverage report
make format          # format all src/ files with Prettier (writes in place)
make format-check    # check formatting without writing (useful in CI)
make typecheck       # tsc --noEmit type check
```

## Testing
Unit tests live in `src/lib/calculator.test.ts` and cover `calculateProjection` and `summarizeProjection` — edge cases, employer match logic, frequency equivalence, and inflation adjustment.

The project uses [Vitest](https://vitest.dev/) (native to the Vite ecosystem) with `@vitest/coverage-v8` for coverage reports, and [Prettier](https://prettier.io/) for formatting (configured in `.prettierrc`).

## Keeping CRA limits current
The RRSP deduction ceiling and TFSA annual limit are hardcoded to their **2024 values** in `src/App.tsx` (`CRA_MAX_2024 = 31560`, `TFSA_ANNUAL_LIMIT_2024 = 7000`). Update these constants each year when CRA publishes new limits, or replace them with a small lookup table keyed by year.

## Customizing
All calculator math lives in `src/lib/calculator.ts`. Tweak assumptions (compounding cadence, CRA limit ceiling, withdrawal heuristics, etc.) there. UI pieces live under `src/components/` for easy iteration.
