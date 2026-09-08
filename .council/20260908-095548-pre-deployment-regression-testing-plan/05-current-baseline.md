# Current Verification Baseline

Read-only verification on 2026-09-08 before external council review:

| Surface | Command | Result |
|---|---|---|
| Backend | `python -m pytest -q` | PASS — 37 passed, 1 Starlette/httpx deprecation warning, 11.70s |
| Analyzer | `npm test` | FAIL — 58 passed, 1 failed, 439ms |
| Analyzer | `npm run lint` | PASS — 7 warnings |
| Analyzer | `npm run build` | PASS — Vite build, 1.82s |
| Landing | `node --test src/components/landing/*.test.mjs` | PASS — 8 passed, 795ms |
| Landing | `npm run lint` | PASS |
| Landing | `npm run build` | BLOCKED — Next.js could not fetch Google Geist Mono from `fonts.googleapis.com` in the restricted environment |
| Browser visual spec | runner probe | BLOCKED — `@playwright/test` is not installed/configured |

The analyzer failure is a behavior/expectation mismatch at `src/lib/result-read.test.js:213`: expected category label `Final technical`, received `Technical`. This is a current deployment blocker until intentionally resolved and rerun.

The landing build failure is not yet classified as a product compile regression; it exposes a build reproducibility risk because the production build depends on an external font fetch. It must pass in the actual clean deployment environment, or the font must be self-hosted/pinned before release.

The Playwright-style file cannot currently provide evidence and must not be counted as passing browser coverage.
