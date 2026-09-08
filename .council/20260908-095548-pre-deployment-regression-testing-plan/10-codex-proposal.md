# Independent Engineering Proposal

## Executive summary

Use a change-aware, four-gate release pipeline rather than a single "run all tests" checklist: (1) repository/reproducibility gate, (2) deterministic component and contract gate, (3) hermetic cross-service browser gate, and (4) production-like deploy/rollback gate. The deployment is blocked until the active analyzer root is unambiguous, every service builds from a clean checkout, the API compatibility matrix passes in both deployment orders, and one automated browser journey covers upload through PDF download. Gemini live verification is a quarantined preflight, not a default blocking regression dependency; local fallback and score authority remain mandatory gates.

## Proposed architecture

Create a release manifest tied to one commit SHA and one candidate artifact per service. Execute these stages in order:

1. **G0 — Source and artifact integrity:** clean-checkout builds, declared runtime versions, dependency/install reproducibility, active deployment roots, environment-variable schema, secret scan, and generated-artifact drift. Fail fast on ambiguous `frontend`/`apps/web`/`apps/web-page` roots or unpinned backend resolution that produces an unreviewed dependency set.
2. **G1 — Fast deterministic suites:** backend unit/API/contract tests; analyzer Node tests, lint, and build; landing Node tests, lint, and build. Store JUnit/build logs and the exact resolved dependency manifests.
3. **G2 — Hermetic integration and browser suite:** start the candidate FastAPI artifact locally with Gemini disabled and fixed licensed fixtures; build/serve candidate frontends with explicit URLs. Test the critical journey, API error paths, CORS, session recovery, accessibility, responsive layouts, and PDF validity. Add old/new contract fixtures to prove both rolling-deployment orders.
4. **G3 — Production-like preview and operational gate:** deploy immutable preview candidates, run smoke/security/performance checks, execute a controlled rollback drill, and require human visual/privacy acceptance. Promote the already-tested artifacts; do not rebuild for production.
5. **Post-deploy:** smoke synthetic fixtures, watch error/latency/resource signals for a defined canary window, then either complete promotion or rollback independently in dependency order.

## Components and interfaces

- `release-manifest`: commit SHA, service artifact IDs, dependency hashes, test run IDs, environment names, migration/contract version, deploy order, rollback targets.
- `fixture corpus`: small synthetic/licensed images covering formats, orientation/EXIF, boundaries, malformed files, and stable semantic CV invariants.
- `contract corpus`: canonical, legacy, mixed, malformed, Gemini-success, and Gemini-fallback JSON fixtures consumed by both backend schema tests and frontend adapter tests.
- `service harness`: starts FastAPI from `backend/main.py`, analyzer from its production build, and landing page from its production build on isolated ports.
- `browser suite`: Chromium mandatory; Firefox/WebKit smoke if supported. Intercepts only truly external nondeterministic resources, not the candidate backend.
- `release report`: gate results, evidence links, exceptions, approvers, preview URLs, performance baselines, and rollback result.

## Data/control flow

Commit SHA -> clean installs/builds -> deterministic tests -> candidate artifacts -> local integrated stack -> compatibility matrix -> preview deployment -> smoke/performance/security -> rollback drill -> go/no-go -> production promotion -> canary monitoring. A failure stops downstream promotion; reruns require a documented flaky-test classification rather than blind retry.

## Algorithm and data-structure choices

- Risk-priority score for test selection: blast radius x likelihood x detectability, each 1-5; any security/privacy, contract, data-corruption, or rollback item is mandatory regardless of total.
- Contract assertions compare required fields/types/invariants and score ranges, not full prose snapshots.
- CV regression uses tolerances and relational invariants (orientation, dimensions, normalized geometry, finite/ranged scores, score-authority equality), with a very small golden set only where deterministic across supported platforms.
- Performance records median/p95/p99, max RSS, queue wait, timeout/error rate, and cold/warm split. Initial release thresholds should be baseline-relative until production SLOs exist: no >15% warm p95 or peak-memory regression from the accepted candidate baseline; zero unexpected 5xx; two concurrent analyses complete within the frontend's 120-second timeout on the production-equivalent instance. Cold-start smoke must either complete inside 120 seconds or surface an explicit retryable state.

## Dependencies

- Existing Python/Node test/build tools.
- Add a declared Playwright dev dependency/config/script for the analyzer (and optionally a shared root harness) before treating the existing visual spec as evidence.
- Prefer a dependency-free HTTP smoke script or existing test client for API deployment checks.
- Optional tools such as axe-core, a load generator, PDF parser, and secret scanner must be version-pinned if adopted.

## Failure modes and recovery

- **Wrong deploy root/stale copy:** G0 blocks; remove ambiguity before testing.
- **Nondeterministic CV/golden drift:** assert invariants/tolerances and retain images/logs; do not widen tolerances without review.
- **External provider/network flakes:** default suite runs Gemini-off and stubs tutorial/image fetches; live checks are isolated and cannot mask fallback failures.
- **Cold-start timeout/queued CPU:** measure cold/warm separately; block if core UX exceeds the timeout or lacks recovery; rollback backend or reduce traffic.
- **Partial deployment contract break:** compatibility fixtures and preview mixed-version matrix block promotion; deploy additive backend first, frontend second, remove legacy fields only in a later release.
- **Bad production environment/CORS:** preflight exact origins and browser OPTIONS/POST; rollback the affected service/config.
- **Post-deploy regression:** canary checks trigger independent rollback to recorded artifact IDs; preserve the prior backend until analyzer rollback is verified.

## Security/privacy considerations

Use only non-sensitive fixtures; strip EXIF except dedicated fixtures; never log image bytes, keys, or provider payloads. Test MIME spoofing, corrupt/decompression-bomb images, size limits, Unicode/path-like filenames, JSON/PDF validation, generic 5xx responses, CORS allow/deny, and absence of persistence. Run dependency/secret scans on the exact commit, but triage findings rather than suppressing them wholesale. Live Gemini preflight uses a restricted non-production secret and verifies provider failure does not alter local score authority.

## Performance/scalability considerations

The process-local semaphore means worker count changes total concurrency and memory risk. Test the actual Render worker/process configuration, one and two simultaneous analyses, analysis plus PDF contention, malformed-request recovery, and a 10x burst that is allowed to shed load predictably. Record CPU, RSS, queue time, and response time by endpoint and image class. Do not promise throughput until an SLO and production instance size are documented.

## Migration and rollback

- Backend-first rollout: deploy additive canonical+legacy response, validate old analyzer, then deploy new analyzer, then landing CTA. Never remove legacy fields in this release.
- Test the reverse/rollback combinations explicitly: old UI/new API and new UI/old API using captured schemas/fixtures and preview artifacts.
- Record prior immutable artifact IDs and environment values. Drill rollback of landing, analyzer, and backend independently; verify health, CORS, upload-analysis-result-PDF flow, and CTA after each rollback.

## Testing strategy

Mandatory matrix:

- **G0:** clean checkout; `npm ci`/production builds for both frontends; reproducible backend install from a reviewed lock/constraints file; active project roots; static asset/resource paths; env URL/CORS consistency; secret/dependency scan.
- **Backend G1:** all current pytest suites; route smoke; schema validation; score-authority/property tests; resource path tests from a clean working directory; upload boundary/format/orientation cases; Gemini classification/fallback; tutorial uniqueness; PDF signature/page/content-disposition tests; concurrency/error recovery.
- **Analyzer G1:** `npm test`, lint, build; adapters for legacy/canonical/mixed/malformed/zero values; upload size/type/dimension helpers; timeout/error copy; session persistence limits; PDF request construction.
- **Landing G1:** invoke timeline tests explicitly, lint, build; CTA target/default and no-JS baseline.
- **G2 API/browser:** all six routes; exact multipart field; CORS allow and deny; upload -> result -> tabs/evidence/tutorial -> refresh -> PDF download; cancellation/retry; backend 400/500/timeout; viewport and keyboard/focus/accessibility smoke at 360x800 and 1440x900; Chromium plus one non-Chromium smoke.
- **Compatibility:** contract corpus cross-consumed by both services and mixed-version preview checks.
- **G3:** preview smoke with exact env; cold/warm latency and limited concurrency; security headers/error leakage; external-link resilience; rollback drill; human visual/privacy check.
- **Post-deploy:** synthetic upload and PDF; CTA/CORS; error rate and p95 latency for 30 minutes or an agreed minimum request count, whichever is longer.

Release blockers: any failing deterministic test/build/lint; ambiguous deploy root; missing runnable E2E critical journey; broken mixed-version contract; production-origin CORS failure; privacy/secret leak; unsafe input bypass; unexpected 5xx; rollback drill failure; or core cold/warm flow exceeding timeouts without graceful recovery. A live Gemini outage alone is not a blocker if fallback, disclosure, and score authority pass and the release does not advertise Gemini as mandatory.

## Main tradeoffs

This adds release discipline and a browser harness to a small MVP, increasing setup time. It avoids a much costlier false-green result from isolated unit suites. Baseline-relative performance gates are weaker than product SLOs, but are honest until representative production measurements exist.

## Strongest argument against this proposal

The four gates may be too heavy for an MVP and could delay deployment while infrastructure (Playwright, preview environment, immutable artifact recording, dependency locking) is built. A narrower checklist could ship sooner, accepting more manual risk.

## Confidence and unresolved questions

High confidence in the gate ordering and contract/browser priorities. Medium confidence in provisional performance thresholds because no production instance configuration, traffic model, SLO, or current timing baseline is stored in the repository. Release ownership and the intended canonical custom domains also need confirmation.
