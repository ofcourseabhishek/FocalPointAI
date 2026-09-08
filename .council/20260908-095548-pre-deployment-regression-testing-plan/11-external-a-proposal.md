# Independent Engineering Proposal (External A, raw response normalized to Markdown)

## Executive summary

The largest risk is not one edge case but that no automated system enforces the release requirements. The proposal is no-go until four foundations exist: CI, runnable Playwright, reproducible landing build, and dependency pinning. It also treats the analyzer's failing label test and absent readiness signal as release issues. The plan uses three independent service pipelines, one shared fixture/contract layer, a four-cell old/new compatibility matrix, staging gates, per-service rollout, a 30–60 minute production bake, and independent rollback.

## Proposed architecture

Share versioned synthetic image/EXIF/malformed JSON fixtures and a canonical+legacy contract schema across three pipelines:

- Landing: lint -> unit -> build.
- Analyzer: lint -> unit -> build.
- Backend: unit -> contract -> integration.
- Compatibility: old/old, old/new, new/old, new/new artifacts, with browser critical journey and contract assertions.
- Staging: E2E, visual/accessibility, performance/reliability.
- Production: rolling service deployments, smoke, 30–60 minute observability bake, independent rollback.

## Components and interfaces

- Pairwise fixture corpus reused by backend and browser tests.
- Schema validator using JSON Schema or Pydantic models.
- Declared Playwright harness/config.
- k6 or Locust staging-only load harness.
- `GET /readyz` distinct from root health.
- Request-ID structured logs with route latency, Gemini usage, semaphore wait, and service version/SHA.

## Data/control flow

CTA -> analyzer validation/preview -> metadata -> analyze -> local CV plus optional Gemini fallback -> canonical result -> tutorials -> PDF. Gates fail closed except live Gemini reachability, which is isolated from merge gating.

## Algorithm and data-structure choices

- Order by likelihood x blast radius x cost to detect later.
- Use pairwise fixture design instead of the full input cross-product.
- Use tolerance and monotonicity invariants for CV.
- Use a small pixel-diff allowance with dynamic regions masked for visual regression.

## Dependencies

Add CI first, then pinned Playwright/browser binaries, exact lock/constraint files, a compatible pinned Starlette/http client pair, self-hosted fonts, contract/performance tools, and readiness. Fence Gemini, Google Fonts, and platform quirks from deterministic gates.

## Failure modes and recovery

Explicitly test Gemini failure fallback and unchanged scores; N=3–5 analyze/PDF contention; process death mid-analysis and later recovery; mixed-version deployments; positive/negative CORS; decompression bombs and 40MP boundaries; malformed EXIF; and external dependency outage.

## Security/privacy considerations

Mechanically restrict the fixture corpus to approved synthetic/licensed assets. Test Unicode/path-traversal filenames independently in upload and PDF paths; positive and negative CORS; generic error bodies with no paths/provider internals; secret non-disclosure across Gemini states; and repeated-analysis starvation risk.

## Performance/scalability considerations

Before SLOs, derive gates from client budgets: warm p95 at or below 50% of timeout is a warning threshold, the full timeout is a hard fail, cold start must complete within 90 seconds, N=3–5 queued requests must complete within budget, and peak RSS must be measured at the 40MP/decompression boundary. Confirm the service is single process/instance because `Semaphore(1)` is process-local.

## Migration and rollback

Pin old/new artifacts in four named compatibility cells. Test new backend still emits legacy fields and new frontend degrades against old payloads. Rehearse each platform-native rollback independently while the other two services remain new, because asymmetric state is the production risk. No database migration is expected, but confirm no new cache/session format creates state coupling.

## Testing strategy

The raw proposal supplied a 21-row matrix. Mandatory highlights:

1. CI itself is P0 and gates everything.
2. Backend `pytest -q`, analyzer `npm test`/lint/build, landing tests/lint/build, all green.
3. Canonical+legacy contracts and all four version combinations.
4. Pairwise image/API edge fixtures and five mocked Gemini states.
5. Hostile filenames and CORS negative checks.
6. Chromium critical journey blocks staging-to-prod; non-Chromium/mobile and visual checks start advisory for 2–3 stable cycles; zero serious/critical accessibility findings blocks release.
7. Staging load with p95/cold/queue/memory evidence.
8. Post-deploy health/readiness/version, a small synthetic analysis, tutorials smoke, 30–60 minute bake, and rehearsed asymmetric rollback.

## Main tradeoffs

Infrastructure delays shipping; mocks cannot catch live Gemini changes; pairwise coverage omits combinations; initially advisory visual/non-Chromium gates leave a temporary blind spot; self-hosting fonts adds maintenance.

## Strongest argument against this proposal

It is an organization-scale process for a possibly single-maintainer MVP. A lighter manual critical-journey checklist plus targeted security/contract tests could ship sooner. The reviewer still considered the P0 correctness and compatibility checks necessary regardless of team size.

## Confidence and unresolved questions

High confidence in structure, lower confidence in provisional numeric thresholds. Open issues: actual Render worker/instance count, async behavior of Gemini calls, any CDN/WAF layer, and the precise dirty-diff semantics.

## Capture note

The provider also made current-version claims about Next.js, Vite, Starlette/httpx, fonts, and Render based on its own web searches. Those claims are not treated as repository facts in the final decision without separate verification. No repository files or secrets were uploaded.
