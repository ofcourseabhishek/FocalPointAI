# Independent Engineering Proposal (External C, raw response normalized to Markdown)

## Executive summary

Use seven gates: unit/static, contracts, API integration, cross-service E2E, browser/visual/accessibility, security/performance, and deploy/observability/rollback. Current blockers: Playwright missing, unpinned dependencies, no readiness or CI, landing font build failure, one analyzer unit failure, no cross-version harness/deployment manifests, and no version/request correlation.

## Proposed architecture

Version landing, analyzer, and backend independently and test explicit new-frontend/old-backend and old-frontend/new-backend combinations. Keep temporary canonical+legacy compatibility. Add readiness and correlated request/version observability.

## Components and interfaces

Validate landing CTA configuration, analyzer file/timeout/result/PDF behavior, all backend routes, canonical plus legacy output, local-score authority, and positive/negative CORS.

## Data/control flow

CTA -> analyzer -> preview/validation -> metadata -> analyze -> local CV and optional Gemini -> result/tutorials -> PDF. Cancellation, retry, reload, cold start, queueing, and partial deployment must leave clean recoverable state.

## Algorithm and data-structure choices

Use schema/invariant assertions, CV tolerances, dual-side size checks, decompression protection, and identity of authoritative scores across Gemini failure/success states.

## Dependencies

Pin backend and both frontend environments; add Playwright; vendor or isolate Google Fonts; maintain a synthetic JPEG/PNG/WebP edge corpus.

## Failure modes and recovery

Test corrupt/spoofed/extreme images, malformed EXIF, Gemini failure/tampering, client disconnect, analyze/PDF contention, worker restart, CORS misconfiguration, partial deployment, and external-resource outage. Assert clean 4xx/5xx behavior, no deadlock/process crash, semaphore recovery, and later request success.

## Security/privacy considerations

No customer data/secrets; synthetic fixtures only; strict CORS; safe PDF filenames/JSON; no PII logs; synthetic quota/load; enforced image bounds.

## Performance/scalability considerations

Suggested starting gates: cold analysis under 8 seconds p95 for a 2MP image, warm under 3 seconds, PDF under 5 seconds, all five concurrent analyses complete without OOM/deadlock, peak RSS under the Render instance limit, and no regression over 20% p95. The reviewer marks these as educated starting points, not established SLOs.

## Migration and rollback

Treat the frontend relocation as breaking-path risk, retain additive schemas, and drill backend rollback first while new UI remains, then analyzer rollback, then landing. Each service should restore the prior version in under two minutes, verified by version observability and critical journey. No data migration is expected.

## Testing strategy

- G0: current deterministic suites/builds/lints, all green.
- G1: every route/schema, legacy coexistence, limits, Gemini states.
- G2: six-route integration, edge fixtures, concurrency, cancel/retry/reload.
- G3: real-browser journey and both mixed-version combinations.
- G4: Chromium + Firefox, desktop 1280x720 + mobile 390x844, one tolerant result screenshot, axe scan with zero critical issues.
- G5: hostile input/CORS plus cold/warm/memory/queue characterization.
- G6: production-like smoke, readiness/version/request ID, rollback drill.

Evidence: JUnit/Playwright reports, traces/screenshots/video, request-ID logs, version headers/SHA, latency histograms, peak RSS, and post-rollback matrix results.

## Main tradeoffs

Dual-contract complexity, small-browser matrix versus broader coverage, provisional metrics versus waiting for SLOs, synthetic safety versus realism, and serialized safety versus throughput.

## Strongest argument against this proposal

The plan may delay the first release by weeks. A smaller critical-journey plus contract gate could be sufficient initially, with broader infrastructure added later.

## Confidence and unresolved questions

High confidence in ranking/order and medium confidence in thresholds. Open issues: Render resources/cold start, whether the label mismatch is intentional, Gemini cost/rate limits, required preview CORS origins, and remaining bad paths from the relocation.
