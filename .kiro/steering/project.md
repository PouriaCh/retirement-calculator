# Project: Retirement Calculator

## Tech Stack
- **React + TypeScript + Vite** — all source files are `.tsx` / `.ts`
- **Tailwind CSS** + PostCSS for styling
- **Chart.js + react-chartjs-2** for charts
- **lucide-react** for icons
- **Docker + Nginx** for production container
- **Vitest** for unit testing
- **Prettier** for formatting (config in `.prettierrc`)

## Folder Structure
```
src/
  App.tsx               # root component
  main.tsx              # entry point
  index.css             # global styles
  components/           # presentational React components
  lib/
    calculator.ts       # all projection math — pure functions, no React
tests/
  calculator.test.ts    # unit tests for src/lib/calculator.ts
```

## Key Conventions
- **No `.js` files in `src/` or `tests/`** — the project is TypeScript-only. Compiled `.js` artifacts must never be committed. They are gitignored via `src/**/*.js` and `tests/**/*.js`.
- **Tests live in `tests/`**, not co-located with source files.
- **`src/lib/calculator.ts`** is the single source of truth for all calculator math. UI components do not contain business logic.
- **`src/data/` does not exist** — it was removed as an empty placeholder. Do not recreate it unless there is actual data to put there.
- Build artifacts (`dist/`, `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`, `coverage/`) are gitignored and must never be committed.

## Running the Project
```sh
npm run dev          # development server at http://localhost:5173
npm run build        # production build
npm run preview      # preview production build at http://localhost:4173
make test            # run unit tests
make format          # format source files with Prettier
make typecheck       # tsc --noEmit
```

## CRA Limits (update annually)
`CRA_MAX_2024 = 31560` and `TFSA_ANNUAL_LIMIT_2024 = 7000` are hardcoded in `src/App.tsx`. Update these constants each year when CRA publishes new limits.
