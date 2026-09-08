# Independent Engineering Proposal (External B, raw response normalized to Markdown)

## Executive summary

The current Snapgrade working tree is in an unreleasable state. Before traffic can be safely routed, three hard blockers must be resolved: a failing unit test in `apps/web-page`, a blocked production build in `apps/landing-page` caused by un-isolated external Google Font fetches, and the absence of pinned dependencies and automated CI execution.

Because Snapgrade decouples three separately deployed components across two platforms (Vercel and Render), the system is vulnerable to cross-origin breakage, contract mismatches during rolling updates, and denial of service via unbounded image parsing or memory exhaustion. The process-local `asyncio.Semaphore(1)` protects against concurrency-driven OOM but converts load into tail latency and queue timeouts.

Use a deterministic seven-stage release-gate pipeline with contract-first verification in both rolling-deployment directions, synthetic golden fixtures for CV invariants, deterministic Gemini transports, and a rollback validation before production cutover.

## Proposed architecture

Retain the three deployable services with these controls:

- Add a non-blocking backend readiness probe distinct from `GET /`.
- Reject files over 20 MiB encoded or 40 MP decoded before heavy allocations.
- Keep CV work off the event loop and behind the single concurrency guard.
- Dual-write and dual-read legacy and canonical response schemas during rolling deployment.

## Components and interfaces

- Landing: validate `NEXT_PUBLIC_ANALYZER_URL` to prevent dead CTAs.
- Analyzer: robust retry, abort, and timeouts (120 seconds analysis; 60 seconds PDF).
- Backend: validate the metadata, analysis, PDF, tutorials, and recommendation contracts, including both legacy and canonical analysis fields.

## Data/control flow

Client validation -> metadata preflight -> serialized threadpool CV -> optional Gemini augmentation with local fallback -> PDF generation. Fail fast at the earliest safe stage.

## Algorithm and data-structure choices

- CV: invariant/tolerance assertions rather than pixel-exact snapshots.
- Concurrency: recognize that `Semaphore(1)` forces linear processing and the event loop becomes the implicit pending queue.
- Payloads: permissive additive parsing for forward/backward compatibility during the migration window.

## Dependencies

Hard blockers called out by the reviewer:

1. Unpinned environments.
2. Missing Playwright dependency/configuration.
3. Landing build's Google Fonts dependency.

## Failure modes and recovery

| Failure | Recovery | Gate test |
|---|---|---|
| Gemini timeout/5xx | Return canonical local-CV result | Mock long latency; assert local scores |
| Memory exhaustion | Semaphore and Pillow pixel limit | Concurrent near-limit images; zero process crashes |
| Corrupt/spoofed file | Reject with 4xx; clear UI state | Zero-byte and renamed non-image |
| Render cold start | Surface bounded waiting/retry | Measure TTFB after idle |

## Security/privacy considerations

Test hostile payloads/decompression bombs, ensure photos and GPS EXIF are not logged or persisted, and sanitize hostile filenames used in PDF responses.

## Performance/scalability considerations

Proposed provisional gates: cold start below 5 seconds, metadata below 2 seconds (p50 below 500 ms), analysis below 110 seconds, and PDF below 50 seconds. The reviewer estimates the serialized service at roughly 0.2 RPS per container and recommends proving horizontal scaling before traffic growth.

## Migration and rollback

Prove:

1. `apps/web-page@HEAD` + `backend@main` (new UI, old API).
2. `apps/web-page@main` + `backend@HEAD` (old UI, new API).

Deploy HEAD to staging, run smoke tests, rollback both Vercel/Render to prior stable artifacts, and rerun the same smoke suite. Passing evidence is required for production approval.

## Testing strategy

1. Static/lint and builds: resolve the label failure and font build issue.
2. Unit suites for both frontends and backend.
3. Pydantic/UI contract fixtures for legacy and canonical structures.
4. Backend CV integration with about ten synthetic/licensed boundary fixtures.
5. Playwright critical path: upload -> analysis -> canonical rendering -> PDF download.
6. Performance/chaos: deterministic Gemini failures and five concurrent requests.

The release engineer owns CI/E2E glue. Evidence is green CI logs plus generated PDF artifacts. Do not make default CI depend on live Gemini; record or construct known-good and failure responses for parser/fallback tests.

## Main tradeoffs

- Semaphore stability sacrifices concurrency and tail latency.
- Temporary schema duplication costs payload size but prevents rolling-deploy downtime.
- CI/Playwright setup delays the immediate release but removes false confidence.

## Strongest argument against this proposal

It demands a comparatively heavy pipeline for an MVP that still lacks basic dependency pinning and a reproducible production build, potentially delaying release to build the testing infrastructure itself.

## Confidence and unresolved questions

High confidence in the risk assessment and gates. Open questions: fixture ownership/licensing, Render scaling budget, and whether the business accepts queueing timeouts when more than one user analyzes concurrently.

## Capture note

The provider's first response was interrupted at `Components and interfaces`; the remainder was requested in the same chat and captured as a continuation. Exact visible thresholds and claims were preserved above. No repository files or secrets were uploaded.
