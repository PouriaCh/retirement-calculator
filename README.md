# Retirement Planner

An interactive, visually-rich RRSP/RPP retirement planner that runs anywhere via Docker. Adjust contribution cadence, annual income, expected market returns, inflation, and salary growth to instantly see your projected balance in both nominal and real dollars.

## Tech stack
- **React + TypeScript + Vite** for a fast, modern SPA experience
- **Tailwind CSS** for polished, responsive styling
- **Chart.js + react-chartjs-2** to visualize growth vs. contributions
- **lucide-react** iconography for subtle visual cues
- **Docker + Nginx** for a reproducible production-grade container image

## Features
- Configurable RRSP/RPP contribution frequency (weekly, bi-weekly, monthly)
- Annual income + contribution inputs only (no employer match assumption)
- Optional CRA RRSP room carry-forward input to align with your tax return
- Market return, inflation, and salary growth levers with live recalculations
- Inflation-adjusted balances, safe withdrawal guideline, and growth insights with inline tooltips
- Combined + per-account charts and milestone table to compare RRSP/RPP vs TFSA over time
- Fully client-side, so your numbers stay on your machine
- CRA RRSP limit check with real-time warning if annual deposits exceed the allowed room plus per-frequency suggestions to max it out
- TFSA planner with its own annual return slider, tax-free growth projections, and annual limit guardrails
- Milestone table showing RRSP vs TFSA balances, combined totals, and percentage split at each age
- Lifestyle snapshot section showing combined RRSP + TFSA nest egg, safe withdrawal income, and motivational insights

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
Common Docker Compose flows are wrapped in the provided `Makefile` so you can type less:

```sh
make up        # docker compose up --build
make down      # docker compose down
make recreate  # docker compose up --build --force-recreate
make clean     # docker compose down --volumes --rmi local --remove-orphans
```

Override the compose binary by setting `COMPOSE="docker compose"` or `COMPOSE="docker-compose"` when needed (default is `docker compose`).

## Customizing
All calculator math lives in `src/lib/calculator.ts`. Tweak assumptions (compounding cadence, CRA limit ceiling, withdrawal heuristics, etc.) there. UI pieces live under `src/components/` for easy iteration.
