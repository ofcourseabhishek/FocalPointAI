# Council Specification

## Objective

Define an executable, risk-based regression-testing and release-gate plan for the current Snapgrade working tree before deployment. The plan must cover the separately deployed landing page, analyzer web app, and FastAPI backend; verify backward/forward compatibility during a rolling deployment; provide explicit stop/go criteria; and include rollback validation.

## Requirements

- Produce a prioritized pre-deployment test matrix with owners, environments, commands, evidence, and pass/fail gates.
- Cover automated unit, contract, integration, browser/E2E, visual/accessibility, security/privacy, performance/reliability, deployment smoke, observability, and rollback checks in proportion to risk.
- Account for the current frontend relocation from `frontend/` through transient `apps/web/` to `apps/web-page/`, plus backend response-contract, scoring, CV, prompt, and result-UI changes.
- Test the critical journey: landing CTA -> analyzer -> supported photo validation/preview -> metadata -> analysis -> canonical result rendering -> diagnostic interactions/tutorials -> PDF download.
- Test JPEG, PNG, and WebP; EXIF orientation; absent/malformed EXIF; malformed/non-image input; 20 MiB encoded limit; 40-megapixel decoded-image limit; timeouts; backend errors; and Gemini unavailable/malformed/success modes.
- Verify deterministic local-CV scores remain authoritative when Gemini is enabled.
- Verify old frontend/new backend and new frontend/old backend compatibility for rolling deploys, including legacy response fields retained alongside canonical fields.
- Include post-deploy smoke checks against production-like URLs without destructive/customer-data operations.
- Identify blockers where the repository cannot currently execute a claimed test layer.

## Non-goals

- No production deployment, production-data mutation, or production-code implementation in this council run.
- No live Gemini call or API credential handling.
- No exhaustive browser/device matrix; choose a defensible minimum and expansion triggers.
- No claim that visual fixtures or external Unsplash/Gemini behavior are deterministic unless explicitly isolated.

## Existing relevant architecture

- `apps/landing-page`: Next.js 16 / React 19 marketing site deployed separately; CTA target is `NEXT_PUBLIC_ANALYZER_URL` with a production fallback.
- `apps/web-page`: Vite 8 / React 19 analyzer; `VITE_BACKEND_URL` controls the FastAPI origin. Node's built-in test runner covers adapters/behavior; oxlint and Vite build scripts exist. A Playwright spec exists at `tests/visual.spec.js`, but `@playwright/test` is not declared in this package's `package.json` and no Playwright config was found.
- `backend`: FastAPI app at `main:app`. Upload routes orchestrate Pillow/OpenCV/NumPy work behind a process-local `asyncio.Semaphore(1)` and a threadpool. ReportLab generates PDFs. Gemini narrative generation is optional and falls back to local CV.
- Public API routes: `GET /`, `POST /image-metadata`, `POST /analyze`, `POST /critique-pdf`, `GET /tutorials`, and `POST /tutorial-recommendations`.
- Canonical analysis sections are `metadata`, `overview`, `analysis`, `visual_breakdown`, `learning_next`, `tutorials`, and `diagnostics`; legacy fields temporarily coexist for compatibility.
- CORS currently allow-lists the two documented Vercel origins plus localhost.
- Production topology documented in the repository: landing page and analyzer on Vercel, backend on Render; Render cold starts are expected.
- No CI workflow, dependency pinning, container/deployment manifest, readiness endpoint, or configured cross-service E2E harness was found in the initial inspection.
- Dated baseline (`docs/INTEGRATION-BASELINE.md`) recorded 24 backend tests before reorganization; the root README separately claims a later 34 backend / 55 frontend result. Neither is a continuously enforced CI signal.

## Constraints

### Technical

- Windows/PowerShell development environment; Python 3.10+ and Node meeting Vite's supported range.
- Three independently built/deployed services and environment-specific URLs.
- Existing user changes are extensive and must be preserved.
- Real-image/CV outputs can be platform-sensitive; regression assertions should prefer invariants/tolerances over brittle pixel-perfect numeric snapshots.
- The current browser spec requires missing or undocumented runner setup.

### Security / privacy

- Repository `.env` files exist under `backend/` and `apps/web-page/`; their contents must not be read into council artifacts or shared externally.
- Never upload user/customer photos or secrets to reviewers or test services. Use synthetic, licensed, or repository-approved fixtures with stripped metadata except when intentionally testing EXIF.
- Gemini-enabled tests must use a controlled non-production credential only in an authorized CI secret store; this planning council must not access it.
- Validate content type and actual image decoding, decompression-bomb limits, PDF payload handling, error redaction, CORS, and non-persistence/privacy expectations.

### Performance / reliability

- `/analyze` is CPU-heavy and serialized per process by a semaphore; tests must characterize cold and warm latency, queue behavior, timeouts, memory, and recovery after malformed/oversized requests.
- Frontend analysis timeout is 120 seconds and report timeout is 60 seconds; the Render cold-start path must fit the user-visible behavior or fail clearly.
- External image/tutorial/provider dependencies may be unavailable; core analysis and result rendering should degrade safely.

### Compatibility

- Test both deployment orders across the API contract migration.
- Validate configured CORS origins and landing/analyzer links in preview and production environments.
- Preserve `main:app`, documented public routes, accepted file formats/limits, canonical schemas, and legacy fields required during the migration window.

## Success criteria

- A release manager can execute the plan without inventing commands, fixtures, thresholds, or expected evidence.
- Every critical journey and high-risk change maps to at least one test and an explicit release gate.
- Mandatory tests are deterministic enough for CI or have a clearly defined manual/prod-smoke procedure.
- Compatibility, security/privacy, performance, observability, rollback, and post-deploy verification are explicit.
- Known test-infrastructure gaps are classified as deployment blockers or accepted risks with owner and deadline.
- The final council decision has an explicit `APPROVED`, `APPROVED_WITH_CONDITIONS`, or `BLOCKED` status.

## Edge cases

- Zero-byte, wrong MIME/extension, truncated/corrupt, animated/multi-frame, CMYK, alpha-channel, extreme aspect-ratio, near-limit bytes, over-limit bytes, decompression-bomb/over-40MP, and EXIF-rotated images.
- No EXIF, malformed EXIF, filenames with Unicode/path-like characters, and duplicate requests.
- Missing Gemini key, invalid key, provider timeout/quota/error, malformed provider JSON, and provider attempts to alter authoritative scores.
- Old/canonical/mixed/malformed analysis payloads; missing evidence; unsupported diagnostic modes; zero/false metric values; tutorial duplicates/broken URLs.
- Analysis cancellation/navigation/retry; page reload/session restoration; browser storage quota; slow/cold backend; CORS rejection; network interruption.
- PDF without image, malformed `analysis_json`, hostile filename, large report, and PDF generation failure.
- Concurrent analysis/PDF requests, worker restart, partial deployment, bad environment URL, and rollback to the prior API/UI independently.

## Likely affected files/modules

- `apps/landing-page/package.json`, CTA components, and landing timeline tests.
- `apps/web-page/package.json`, `vite.config.js`, `src/App.jsx`, upload/result components, `src/lib/*`, and `tests/visual.spec.js`.
- `backend/main.py`, `backend/app/api/**`, `backend/app/schemas/analysis.py`, analysis/scoring/vision/export/metadata/recommendation services, prompt/catalog/cascade assets, and `backend/tests/**`.
- Root/deployment documentation and any future CI, Playwright, fixture, load-test, or release-check files.

## Questions the council must resolve

1. What is the minimum mandatory regression pyramid and exact gate order for this MVP release?
2. Which gaps are hard deployment blockers versus follow-up risks?
3. How should contract compatibility be proven for both rolling-deployment orders?
4. Which browser/device/accessibility and visual checks give adequate confidence without excessive flakiness?
5. What performance thresholds are defensible given Render cold starts and serialized CPU analysis?
6. How should Gemini behavior be tested without making the default gate dependent on an unstable paid/external service?
7. What evidence and observability are required for go/no-go and rollback?
8. What rollback drill proves that frontend, landing page, and backend can be reverted independently?

## Sanitization notes

Safe to share externally: this specification, public package scripts/dependency names, documented architecture and URLs, route/field names, test counts, and abstracted working-tree risk descriptions. Do not share `.env` contents, credentials, personal/customer data, uploaded photographs, private endpoints, full repository contents, or unrelated proprietary code. A filename-only scan found `.env` files; no secret values were copied. External reviewers receive only this sanitized specification.
