# FocalPointAI Project Update Report

**Reporting date:** July 17, 2026  
**Repository:** `ofcourseabhishek/FocalPointAI`  
**Current branch:** `NewDashboard`  
**Current revision:** `589a331` (`Dashboard redesign`)  
**Report scope:** Product progress, technical status, validation results, delivery risks, and recommended next steps based on the repository snapshot on July 17, 2026.

---

## 1. Executive Summary

FocalPointAI has reached a functional MVP stage. A user can upload a photograph, provide an email address, receive an evidence-based critique, explore the result in a responsive dashboard, and receive a styled HTML report. The analysis pipeline remains useful when Gemini is unavailable because the application computes its own scores with OpenCV and EXIF evidence before requesting any AI-written narrative.

The most important progress in the current development cycle is:

- A major redesign of the upload, loading, and analysis dashboard experience.
- An expanded local computer-vision pipeline covering composition, subject placement, horizon alignment, sharpness, faces and eyes, sky coverage, background clutter, saliency, and color palette extraction.
- A deterministic score engine that keeps numeric results under application control instead of allowing Gemini to invent or change them.
- Explicit Gemini rate-limit and failure classification with automatic local fallback.
- A redesigned, email-client-friendly critique report with plain-text and HTML versions, inline imagery, downloadable attachment support, and SMTP simulation fallback.
- Initial automated coverage for scoring authority, Gemini error classification, HTML escaping, report content, and SSL email delivery.

The frontend is currently buildable and lint-clean. The backend test files contain seven unit tests, but they could not be executed in the reporting environment because no accessible Python runtime is installed. Production deployment health, live Gemini behavior, and live SMTP delivery were not tested as part of this report.

### Overall status

| Area | Status | Assessment |
|---|---|---|
| Core MVP | **Functional** | End-to-end upload, analysis, results, and report workflow is implemented. |
| Frontend | **Healthy** | Production build and lint both pass. Dashboard redesign is the latest committed work. |
| Backend API | **Implemented, verification pending** | FastAPI health and analysis routes exist; runtime verification needs Python. |
| Local CV analysis | **Strong MVP coverage** | Most Phase 2 CV signals are already implemented. Accuracy still needs dataset-based evaluation. |
| Gemini integration | **Resilient design** | Failures are classified and fall back locally; live provider/model validation is still required. |
| Email reporting | **Implemented** | Rich report and SMTP paths exist; production SMTP delivery needs an external smoke test. |
| Automated testing | **Early** | Seven focused backend unit tests exist; no API integration or browser end-to-end suite is present. |
| Deployment | **Configuration documented** | Live Vercel/Render state was not verified in this report. |
| Roadmap Phase 1 | **Partial** | EXIF extraction and diagnostics exist; RAW upload/decoding does not. |
| Roadmap Phase 2 | **Substantially underway** | Many enhanced CV capabilities are already present despite being listed as future work. |

---

## 2. Product State

### Current user journey

1. The user selects a demo photograph or uploads a JPG, PNG, or WEBP image.
2. The frontend validates the image and collects an email address.
3. The image and email are submitted to `POST /analyze`.
4. The backend extracts available EXIF metadata.
5. OpenCV computes image statistics, technical evidence, composition signals, and local critique data.
6. The deterministic scoring engine calculates authoritative aspect, category, and overall scores.
7. If `GEMINI_API_KEY` is configured, Gemini receives a compact evidence package and produces the critique narrative. Local values replace any model-provided scores or EXIF facts.
8. If Gemini is missing, unavailable, invalid, timed out, or rate limited, the local critique is returned instead.
9. The frontend renders the analysis dashboard with category tabs, technical details, warnings, and suggested edits.
10. A background task sends the styled email report when SMTP is configured; otherwise it writes `backend/email_simulation.html`.

### User-facing capabilities currently implemented

- Drag-and-drop and file-picker upload flow.
- Client-side image validation and a 15 MB upload limit.
- Demo-image presets for immediately testing the experience.
- Multi-step analysis loading state with rotating photography quotes.
- Overall score and categorized critique dashboard.
- Composition, lighting and exposure, focus and sharpness, color and tones, subject and story, and post-processing views.
- Detailed strengths, weaknesses, sub-aspect scores, and suggested edits.
- EXIF display for shutter speed, aperture, ISO, focal length, camera, and lens when available.
- Camera-setting diagnostics that combine metadata with visual evidence.
- Clear UI messaging when Gemini is rate limited or email is only simulated.
- Responsive HTML email report with a plain-text alternative.

---

## 3. Technical Architecture Update

### Frontend

The frontend uses React 19, Vite 8, Lucide React, and custom CSS. The application currently concentrates most behavior and rendering in `frontend/src/App.jsx`.

Key responsibilities include:

- Upload and drag-state management.
- Image validation and previews.
- Demo image retrieval.
- Backend request orchestration through `VITE_BACKEND_URL`.
- Loading progress and quote rotation.
- Score normalization and category mapping.
- Result dashboard and category-specific visualizations.
- Email and Gemini status messaging.

The latest commit adds 1,352 lines across `App.jsx` and `index.css`, reflecting the scale of the dashboard redesign. The frontend production output is currently approximately:

- HTML: 0.67 kB, 0.42 kB gzip.
- CSS: 32.12 kB, 7.45 kB gzip.
- JavaScript: 231.65 kB, 72.98 kB gzip.

### Backend API

The FastAPI service exposes two routes:

- `GET /` returns the application health response.
- `POST /analyze` accepts an image and email address and returns the completed analysis while scheduling report delivery.

The main request pipeline lives in `backend/main.py`, which currently also owns EXIF extraction, email content generation, SMTP delivery, API routing, and orchestration.

### Computer-vision pipeline

`backend/cv_fallback.py` provides the local analysis engine. It currently includes:

- Face detection and eye detection through bundled Haar cascades.
- Saliency estimation and subject-centroid detection.
- Subject centering and rule-of-thirds distance.
- Horizon-line detection and tilt assessment.
- Blur/sharpness evaluation using Laplacian variance.
- Sky segmentation.
- Background clutter estimation.
- Dominant color palette extraction.
- Rule-of-thirds, golden-ratio, leading-line, symmetry/pattern, framing, and negative-space composition signals.
- Brightness, contrast, saturation, warmth, highlight, shadow, detail, ambiance, crop, and color heuristics.
- EXIF-aware photographer-intention and camera-setting diagnostics.

This local engine is more than a basic availability fallback: it is now the evidence and scoring foundation for both local and Gemini-assisted results.

### Deterministic scoring

`backend/score_engine.py` is a significant architectural improvement. It:

- Computes all public scores from local CV and EXIF evidence.
- Uses the strongest detected composition structures instead of penalizing an image for not using every possible technique.
- Produces composition, lighting, exposure, color, focus, and noise category scores.
- Adjusts noise quality using ISO when EXIF data is available.
- Sends Gemini a compact context that excludes large visual payloads such as the saliency map.
- Preserves Gemini prose while replacing Gemini-provided scores and facts with application values.

This design makes results more reproducible, easier to test, and less vulnerable to model hallucination.

### Gemini integration

The Gemini adapter:

- Sends the image and application-computed evidence in a multimodal request.
- Requires JSON output.
- Parses and normalizes fenced or plain JSON responses.
- Classifies quota/rate-limit, authentication, timeout, service, and general failures.
- Allows the main analysis route to fall back without losing the user workflow.

The model identifier is currently hard-coded in the API URL. This should be configuration-driven and validated in the deployed environment to reduce provider-version risk.

### Email reporting

The email system now supports:

- Plain-text and responsive HTML report bodies.
- Escaped dynamic content to reduce HTML-injection risk.
- Category and sub-aspect score cards.
- Camera-setting and diagnostic sections.
- Inline analyzed image using a content ID.
- A second downloadable image attachment.
- SMTP over SSL on port 465 or STARTTLS when supported on other ports.
- Local HTML simulation when credentials are missing or SMTP delivery fails.

The API correctly reports email delivery as `queued` rather than `sent` because delivery runs after the HTTP response. Final success or failure is currently visible only in server logs.

---

## 4. Recent Delivery Summary

There have been 21 commits since July 16, including merge commits. The most material recent changes are:

### July 16

- Major UI remodeling and new visual background assets.
- Expanded CV fallback and critique prompt behavior.
- Introduction of the evidence-based CV pipeline and deterministic score engine.
- Rule-of-thirds score integration in the composition result.
- Addition of focused scoring and Gemini tests.

### July 17

- Gemini rate-limit handling and stable failure statuses.
- Reinstatement and expansion of authoritative score enforcement.
- Email report redesign and email-content tests.
- Large dashboard redesign, including a more structured result experience and expanded styling.

The current branch is aligned with `origin/NewDashboard` at revision `589a331`. At report time, the tracked worktree had no recorded modifications; documentation files, including this report, were present as untracked local work.

---

## 5. Quality and Verification Status

### Checks completed for this report

| Check | Result | Evidence |
|---|---|---|
| Frontend lint | **Passed** | `npm.cmd run lint` completed with no findings. |
| Frontend production build | **Passed** | Vite transformed 1,773 modules and generated the production bundle. |
| Git whitespace/error check | **Passed** | `git diff --check` returned no tracked diff errors. |
| Branch tracking | **Passed** | `NewDashboard` tracks `origin/NewDashboard`. |

### Checks not completed

| Check | Status | Reason |
|---|---|---|
| Backend unit tests | **Not executed** | The environment exposes only an inaccessible Windows Store Python alias; the Python launcher reports no installed runtime. |
| Python compile check | **Not executed** | Same Python runtime limitation. |
| Live API smoke test | **Not executed** | Backend could not be started without Python. |
| Live Gemini request | **Not executed** | Requires backend runtime, credentials, network access, and provider quota. |
| Live SMTP delivery | **Not executed** | Requires backend runtime and valid SMTP credentials. |
| Browser end-to-end test | **Not executed** | No running backend or automated E2E suite was available. |

### Existing automated coverage

Seven backend unit tests currently cover:

- Gemini cannot override local scores or EXIF facts.
- Gemini context stays compact and includes authoritative evidence.
- Rate limits and other provider failures map to stable statuses.
- Email report sections and styling are present.
- Dynamic report values are HTML escaped.
- SSL SMTP delivery uses the SSL path and embeds the report image.

Coverage is focused and valuable but still narrow. There are no committed tests for the `/analyze` route, file-validation behavior, CV behavior across a representative image set, STARTTLS delivery, SMTP failure fallback, frontend components, or a full user journey.

---

## 6. Roadmap Progress Assessment

### Phase 1 - EXIF Intelligence and RAW File Support: partial

Implemented:

- EXIF extraction through Pillow.
- Shutter speed, aperture, ISO, focal length, camera, and lens formatting.
- EXIF-aware critique and camera-setting diagnostics.
- Metadata displayed in the dashboard and email report.

Outstanding:

- RAW file upload and decoding.
- RAW preview generation.
- Reliable metadata preservation across RAW conversion.
- Broader camera and lens normalization.
- Tests using real EXIF samples from different manufacturers.

### Phase 2 - Enhanced Computer Vision: substantially underway

Already implemented or partially implemented:

- Rule-of-thirds detection.
- Horizon alignment.
- Subject positioning.
- Blur/sharpness detection.
- Face and eye detection.
- Background clutter scoring.
- Saliency mapping.
- Color palette extraction.
- Symmetry and pattern detection.
- Leading lines, framing, negative space, and golden-ratio signals.

Still needed:

- Accuracy benchmarks against a curated photography dataset.
- Explicit noise estimation independent of ISO and focus proxies.
- Confidence values and graceful handling of uncertain detections.
- Visual overlays for saliency, horizon, detected faces, and crop guidance.
- Performance profiling for large images and concurrent requests.

### Phase 3 - AI Crop and Lightroom Preset Suggestions: not started as a complete feature

The existing system produces crop-related scores and editing suggestions, but it does not yet generate crop coordinates, overlay previews, before-and-after comparisons, named Lightroom presets, or exportable adjustment settings.

### Phases 4-11: not started

Authentication, persistent storage, cloud storage, the conversational photography coach, progress tracking, learning content, community features, and professional batch/portfolio workflows are not represented in the current application architecture.

---

## 7. Risks, Gaps, and Technical Debt

### High priority

1. **Backend verification gap.** The current Python code has not been executed in this reporting environment. A clean Python environment must run all tests and one real `/analyze` request before release.
2. **No server-side upload limit.** The frontend enforces 15 MB, but the backend reads the entire upload into memory and does not enforce a size cap. A direct API caller can bypass the client restriction.
3. **Deployment configuration can fail silently.** The frontend falls back to `http://127.0.0.1:8000` when `VITE_BACKEND_URL` is missing. In production this points at the visitor's machine and can make the analysis flow appear broken.
4. **Permissive CORS.** The API currently allows every origin, method, and header. Production should use an explicit frontend-origin allowlist.
5. **Provider configuration is hard-coded.** The Gemini model identifier is embedded in source instead of an environment setting, which makes model migration and provider validation harder.

### Medium priority

6. **Monolithic frontend and backend files.** `App.jsx` is approximately 2,029 lines, `index.css` 2,037 lines, `main.py` 880 lines, and `cv_fallback.py` 922 lines. This increases regression risk and slows focused testing.
7. **Email delivery is not observable to the client.** The response only knows that delivery was queued. There is no job ID, retry queue, delivery record, or status endpoint.
8. **Simulation output is a single shared file.** Concurrent requests can overwrite `backend/email_simulation.html`, and writing to the application filesystem is unreliable on ephemeral production hosts.
9. **Input validation is limited.** The backend trusts the declared MIME prefix before Pillow/OpenCV processing and does not normalize filenames, validate the email with a typed schema, or enforce pixel/dimension limits.
10. **Dependencies are unpinned.** Backend requirements contain package names without versions, reducing build reproducibility.
11. **No continuous-integration configuration is present.** Lint, build, and backend tests are not automatically enforced on every pull request.

### Product and quality risks

12. **CV accuracy is unmeasured.** Heuristic scores are deterministic but not yet proven to correlate with expert photographic judgment across genres and lighting conditions.
13. **Roadmap status is stale.** Phase 2 still reads as entirely future work even though much of it exists. The roadmap should distinguish shipped, beta, and planned capabilities.
14. **No persistence.** Results, delivery status, user history, and uploaded images disappear after the request lifecycle.
15. **Privacy and retention need definition.** The product sends image data to Gemini when configured and may email the original image. A production version needs clear consent, retention, deletion, and logging policies.

---

## 8. Recommended Next Priorities

### Priority 1 - Stabilize and release the current MVP

- Create a clean Python 3.10+ environment and run all seven tests.
- Add an API integration test for successful local analysis and key validation failures.
- Run a live smoke test for local fallback, Gemini success, Gemini rate limiting, SMTP success, and SMTP failure.
- Replace the production localhost fallback with a clear configuration error.
- Restrict CORS to configured frontend origins.
- Enforce backend upload byte and pixel limits.
- Pin backend dependency versions and add CI for Python tests, frontend lint, and frontend build.

### Priority 2 - Finish roadmap Phase 1

- Select and prototype a RAW decoding library.
- Generate a browser-safe preview while retaining the original RAW metadata.
- Build a metadata normalization layer and fixtures for major camera brands.
- Add clear unsupported-format and metadata-missing UX.

### Priority 3 - Validate and complete Phase 2

- Assemble a labeled evaluation set spanning portraits, landscapes, architecture, street, macro, wildlife, low light, and intentionally unconventional compositions.
- Compare local scores with expert ratings and tune thresholds from evidence.
- Add confidence scores and visual overlays for CV findings.
- Introduce dedicated image-noise estimation.
- Measure processing time and memory usage across image sizes.

### Priority 4 - Deliver actionable editing output

- Generate explicit crop coordinates and aspect-ratio recommendations.
- Render crop overlays and before/after previews.
- Map analysis findings to structured Lightroom slider adjustments.
- Add exportable editing instructions before attempting broad preset generation.

### Priority 5 - Refactor before platform expansion

- Split the frontend into upload, loading, summary, category, EXIF, and report-status components.
- Move backend email, EXIF, analysis orchestration, and settings into dedicated modules.
- Introduce typed API response models and centralized configuration.
- Add persistence only after the analysis contract and delivery workflow are stable.

---

## 9. Proposed Short-Term Delivery Plan

### Release hardening sprint

**Goal:** Establish a reproducible, deployable MVP baseline.

- Backend environment and test execution.
- API integration tests and a small image-fixture set.
- Environment validation, CORS allowlist, and upload limits.
- CI pipeline for backend and frontend checks.
- Vercel/Render production smoke test.
- Live Gemini and SMTP verification with logs captured.

**Exit criteria:** All automated checks pass; one supported image completes the live end-to-end flow; local fallback works when Gemini is disabled; delivery behavior is unambiguous when SMTP is enabled or disabled.

### EXIF and RAW sprint

**Goal:** Complete the highest-priority roadmap phase.

- RAW format selection and decoding proof of concept.
- Preview generation and metadata retention.
- Cross-camera EXIF fixtures.
- Dashboard and report updates for richer settings.

**Exit criteria:** At least two common RAW formats can be uploaded and analyzed without losing the core camera metadata used by the critique.

### CV validation and crop sprint

**Goal:** Turn the current heuristic breadth into measured quality and the first practical editing output.

- Curated evaluation dataset and baseline metrics.
- Threshold calibration and confidence values.
- Crop-coordinate generation and overlay UI.
- Structured Lightroom adjustment schema.

**Exit criteria:** CV changes are backed by repeatable evaluation results, and the user can preview a concrete recommended crop.

---

## 10. Release Readiness Checklist

- [x] Frontend lint passes.
- [x] Frontend production build passes.
- [x] Local fallback architecture is implemented.
- [x] Gemini failure states are classified.
- [x] Email HTML escapes dynamic content.
- [ ] Backend unit tests pass in a clean Python environment.
- [ ] API integration test passes.
- [ ] Production backend health endpoint is verified.
- [ ] Production frontend uses the correct `VITE_BACKEND_URL`.
- [ ] Gemini model and quota are verified live.
- [ ] SMTP success and failure paths are verified live.
- [ ] Server-side upload size and dimension limits are enforced.
- [ ] Production CORS origins are restricted.
- [ ] CI is required on pull requests.
- [ ] Privacy, image retention, and deletion behavior are documented.

---

## 11. Conclusion

FocalPointAI is no longer only a prototype concept: its main critique workflow, hybrid analysis architecture, dashboard, and email reporting are implemented. The strongest recent engineering decision is making local CV and EXIF evidence authoritative while using Gemini only to improve explanation quality. That gives the product a credible path toward reliable and testable feedback.

The immediate objective should be release hardening rather than adding another broad feature area. Once the backend is verified in a reproducible environment, deployment safeguards are added, and CV behavior is measured against representative photographs, the team can complete RAW support and move into concrete crop and Lightroom guidance with much lower regression risk.
