# Git Workflow

## Branches
- **Never push directly to `main`** — always work on a feature branch
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Example: `feat/add-tfsa-planner`, `fix/employer-match-cap`, `chore/update-cra-limits`

## Commits
- Stage specific files — never use `git add .` blindly
- Before staging, always check `git status` to confirm what's included
- Commit message format: short imperative subject line, followed by a bullet list of changes for larger commits
- Example:
  ```
  Add employer match cap logic

  - Clamp employer match at matchCap% of annual salary
  - Add unit tests for capped and uncapped scenarios
  - Update README with new input field description
  ```

## What to Never Commit
- `node_modules/`, `dist/`, `coverage/`
- `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`
- Any `*.js` file inside `src/` or `tests/` — these are compiled artifacts
- `.env` files or files containing secrets/tokens
- `.DS_Store`

These are all covered by `.gitignore`. If git is tracking a file that should be ignored, use `git rm -f <file>` to remove it from tracking.

## Pull Requests
- Always push to a feature branch and open a PR against `main`
- Use `git push -u origin <branch>` when pushing a new branch for the first time
- PR title: concise, under 70 characters
- PR description should cover: what changed, why, and what was tested
- After pushing, GitHub will print a URL to create the PR — use it or use the `mcp_github_create_pull_request` tool

## Before Committing Checklist
1. `make test` — all tests pass
2. `make typecheck` — no TypeScript errors
3. `make format-check` — no formatting violations
4. `git status` — no unintended files staged
