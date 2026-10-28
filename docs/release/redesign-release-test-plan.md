# Release test plan: result-page redesign + structured critique

**Status:** draft, not yet run · **Release decision:** NO-GO until every blocking gate below has evidence

This plan applies the approved regression strategy in
`.council/20260908-095548-pre-deployment-regression-testing-plan/40-decision.md` to one
specific release. It does not replace that plan: where a gate here says "council P0", the
council's full definition applies. This document adds what is specific to this change set.

## What is shipping

| Change | Where it lives today | Service |
|---|---|---|
| Upload page: shape-hero, Kokonut file-upload, Enter-to-send command button, loader overlay, two-stage upload/analysis retry | `main` (`b10c364`) | Analyzer (`apps/web-page`) |
| Pull-cord light/dark theme, persisted, carried into the result page | `main` (`b10c364`) | Analyzer |
| Result page rebuilt as one scrolling page with a floating section index, plain-language Numbers, comment-only Breakdown, three-lesson Improve section with a featured thumbnail | `main` (`d0fab5c`, `b2c5de6`) | Analyzer |
| Prompt asks for frame-specific, plain-language critique and a fixed assessment vocabulary; lesson `duration`; 60 s Gemini timeout; email helper moved into `app/` | PR #24 → `master` | Backend |
| `mistake-guidance` positive-word matching fix | `main` (`f129bfa`, whole-word) and PR #24 (word-start, stricter and correct) | Analyzer |

`main` was cut before `master`'s backend reorganisation and has its own `apps/web-page`;
`master` has a different `apps/web-page`. Shipping both means **merging `main` and `master`
first**, which is where most of the risk sits.

## Stage 0 — Get to one candidate (blocking)

Nothing below can be tested until there is a single source for each service.

- [ ] Merge PR #24 into `master` (backend-only plus the matcher fix; low conflict risk).
- [ ] Merge `master` into `main` (or the reverse) on a release branch and resolve the
      `apps/web-page` conflicts deliberately: the redesign's components and `result-read.js`
      adapter win for the result page; keep `master`'s backend and canonical contract.
- [ ] Keep exactly one `mistake-guidance.js`: PR #24's word-start version (`main`'s
      whole-word version wrongly rejects "Properly exposed").
- [ ] Decide the root `.gitignore` `lib/` rule (it hides `apps/web-page/src/lib`); change it to
      `/lib/` so new files there are not silently left out of commits.
- [ ] Record the candidate SHA and the currently deployed artifact/deployment IDs for backend,
      analyzer and landing (council stage 1 / release manifest). Confirm each previous
      artifact is retrievable before going further.

**Exit:** one release branch, builds from a clean checkout, manifest started.

## Stage 1 — Deterministic checks on the release branch (blocking, council P0)

Run from a clean clone, not a working copy.

| Check | Command | Pass condition |
|---|---|---|
| Backend unit + contract | `cd backend && python -m pytest -q` | All pass (37 on PR #24 today) |
| Backend real-image matrix | `cd backend && python tests/real_image_matrix.py` | Canonical category set, tutorial integrity and normalised geometry hold for every image/variant |
| Analyzer unit | `cd apps/web-page && npm ci && npm test` | All pass. **Known pre-existing failure on `master`:** "uses the brief category order and six-part numbering for the complete Visual Breakdown"; it must be fixed or the test updated to the redesign, not ignored |
| Analyzer lint | `cd apps/web-page && npm run lint` | No errors; warnings triaged and recorded |
| Analyzer build | `cd apps/web-page && npm run build` | Succeeds |
| Landing build | `cd apps/landing-page && npm ci && npm run build` | Succeeds under the deploy builder's network policy (council blocker: font fetch) |

Add these tests before running Stage 1, because the change set has no coverage for them yet:

- [ ] **Canonical-to-redesign contract test (analyzer).** Feed a real `/analyze` canonical
      response (captured from the release backend, Gemini off and on) through
      `getResultReadModel` and assert every redesigned section has content: read headline,
      scores, keep/change/try, breakdown comments per category, Numbers verdicts, Improve
      lessons with `duration` and thumbnails. `main` already has a prompt-shaped test in
      `result-read.test.js`; this one must use the canonical shape `master` actually returns.
- [ ] **Local-CV-only response (no Gemini).** Same assertions with `GEMINI_API_KEY` unset.
      Expect thinner text, but no section may render empty or show "undefined"/raw numbers
      in the Breakdown.
- [ ] **Metric guide coverage.** Every measurement label the backend emits in
      `image_statistics` / measured evidence maps to a `describeMetric` meaning
      (`apps/web-page/src/lib/metric-guide.js`); unknown labels are listed, not silently bare.

## Stage 2 — Backend behaviour of PR #24 (blocking)

- [ ] **Gemini failure classes (recorded/mocked, council P0):** timeout, 429, 5xx, malformed
      JSON, empty response. Each returns 200 with authoritative local scores and all canonical
      sections; `diagnostics.ai_status` names the failure.
- [ ] **Timeout headroom:** with a mocked Gemini that answers at 35 s and at 59 s, `/analyze`
      returns the Gemini critique (previously the 35 s case fell back). At 61 s it falls back
      cleanly. Total request time stays under the analyzer's 120 s client limit.
- [ ] **Scores stay authoritative:** a recorded Gemini response that writes numbers into
      ratings, `assessment` or `value` does not change any score in `analysis`.
- [ ] **Tutorials:** every canonical lesson has an HTTPS YouTube URL, `duration` equal to the
      catalog runtime, `matched_metric_ids`, and a working `thumbnail_url` or
      `thumbnail_fallback_url` (spot-check `maxresdefault` 404s fall back to `hqdefault`).
- [ ] **Email helper move:** `python -c "import app.services.export.emailing_engine"` succeeds
      in the deployed image, and it is still not reachable from any route.

## Stage 3 — Prompt quality with live Gemini (advisory, but run before go)

Live Gemini is advisory per the council (not a deterministic gate), but this release changes
the prompt, so it must be looked at by a person before promotion.

Run 8–10 real photographs covering: portrait, landscape with a horizon (one deliberately
tilted), low-key/dark, high-key/bright, motion blur, noisy high-ISO, monochrome, busy street
scene. For each, record:

- [ ] `first_impression` is two sentences and the first works as a headline (≤ 26 words).
- [ ] Sentences name parts of the frame; no generic tips; no unexplained numbers.
- [ ] `assessment` values come from the vocabulary. The tilted horizon is "Crooked horizon"
      and appears in Actions → "What went wrong, and how to fix it".
- [ ] Monochrome is not criticised for colour (intent profile respected).
- [ ] No hallucinated camera settings when EXIF is missing.
- [ ] Latency per request (median and worst) is recorded as a baseline.

Keep the inputs and responses (minus any personal data) as recorded fixtures for Stage 2.

## Stage 4 — Critical browser journey (blocking, council P0)

Chromium desktop is blocking; run the same journey once in Firefox or WebKit as a smoke.
Playwright is not installed yet (`tests/visual.spec.js` cannot run); install it on the release
branch or run the journey manually with screenshots retained as evidence.

Upload page:

- [ ] Hero fits one screen with no scroll at 1366×623, 1440×900 and 1920×1080; pills settle
      within the hero; brand top-left, lamp top-right.
- [ ] Add a photo by drop and by browse → row shows "Uploaded ✓"; drop zone reads
      "Photo added / Remove it to choose another photo"; "Analyze photograph" becomes enabled.
- [ ] Invalid file (wrong type, > 20 MB, corrupt JPEG) fails **on the row** with Retry/✕ and the
      Analyze button stays disabled.
- [ ] Enter key and button click each send exactly one request (check the network log).
- [ ] Loader overlay appears with gold rings; Cancel stops the request and leaves the photo
      added; Retry analysis after a forced backend error succeeds **without re-adding the photo**.
- [ ] Backend offline → "Could not reach the critique service" in the overlay, photo kept.

Result page:

- [ ] Every section renders with content: Read, Scores, Actions (incl. fixes), Breakdown,
      Numbers (each measurement has a verdict and meaning), Improve (3 lessons, featured card
      with thumbnail and duration).
- [ ] Brand scrolls away; lamp stays fixed; content never sits under the lamp at tablet width
      and up; section index stays off-white in both themes.
- [ ] Section index: unfolded at top, folds after scrolling, active item follows scroll,
      clicking jumps to the section below the bar.
- [ ] Photo evidence modes (Image/Attention/Light/Focus/Composition) switch; unavailable ones
      are disabled.
- [ ] Download report produces a valid PDF (council PDF checks: `%PDF-`, opens, headings).
- [ ] "Analyze another photograph" returns to a clean upload page; reload restores the last
      result from session storage; the theme persists across reload and pages.
- [ ] Repeat the whole journey with Gemini forced offline.
- [ ] Accessibility: axe on upload, loader and result pages, zero critical/serious; keyboard
      only: Tab to drop zone, Enter sends, the loader's Cancel button gets focus (Escape is not
      wired to cancel in the new flow; decide whether it should be), section index usable with
      arrow keys; the pull-cord has a keyboard switch.

## Stage 5 — Mobile and theme (blocking for mobile layout)

Mobile behaviour for the lamp and section index is **not designed yet**: both are hidden below
768 px. Before release, decide and test:

- [ ] At 390×844 and 360×740: no horizontal scroll; upload works by tap; result sections are
      readable; the page is usable without the section index and theme switch.
- [ ] Decide whether mobile ships without a theme switch (it follows the last stored theme, or
      dark by default). Record the decision here.
- [ ] Light and dark theme screenshots of every page section at desktop width.

## Stage 6 — Compatibility, resilience, rollout (blocking, council P0)

Use the council's definitions; release-specific notes:

- [ ] **Four compatibility cells.** Cell 3 (redesigned analyzer + previous backend) is the
      important one here: the redesign must still render a previous-backend response (legacy
      shape) without empty sections, so the analyzer can be rolled back independently.
- [ ] **Abort and N=2 concurrency** with the new 60 s Gemini timeout: two concurrent analyses
      must still finish inside the 120 s client limit or get a deliberate overload response.
- [ ] **CORS:** production analyzer origin is in `ALLOWED_ORIGINS` (`app/api/__init__.py`
      currently allows `snapgradebyark.vercel.app`, `snapgrade-app.vercel.app`, localhost).
- [ ] **Promotion order:** backend → analyzer → landing, smoke after each, rollback drill per
      service before promotion.

## Go / no-go

GO requires: Stage 0 complete; Stages 1, 2, 4, 6 all green with retained evidence; Stage 3
reviewed by a person with no blocking finding; Stage 5 mobile decision recorded and tested;
the council's ten conditions in `40-decision.md` satisfied. Record the decision, date and
evidence location below.

| Field | Value |
|---|---|
| Release branch / SHA | |
| Previous artifact IDs (backend / analyzer / landing) | |
| Evidence location | |
| Decision (GO / NO-GO) and reviewer | |
