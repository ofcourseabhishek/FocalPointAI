# Test results: Stage 0 merge, Stage 1 real-photo checks, Stage 4 browser journey

**Dates:** 2026-10-27 (Stages 0–1), 2026-10-28 (fixes and Stage 4, see §8) ·
**Plan:** [`redesign-release-test-plan.md`](redesign-release-test-plan.md)
**Release decision:** still **NO-GO**. Stages 0, 1 and most of 4 are done. Two high-severity
backend findings (F2, F7) and the backend half of F1 are open, and Stages 2, 3, 5 and 6 have not
been run.

### Findings status at a glance

| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | High | Hazy/minimalist photos read as blurred (focus 9 and 21/100, "camera shake" advice) | **Partly fixed.** Numbers wording fixed (`253c392`); backend focus score and fallback text still wrong (§8.3) |
| F2 | High | A camera-app white border reads as blown highlights and skews the whole analysis | **Open** (backend); wording interim fix in `253c392`. Wider impact than first reported (§8.3) |
| F3 | Medium | Empty "Final technical" card without Gemini | **Fixed** (`62dcdb8`) |
| F4 | Medium | Hollow "Try this next" card on 8/17 photos without Gemini | **Fixed** (`62dcdb8`) |
| F5 | Low | Real-image matrix expected a renamed category | **Fixed** (`af80d22`) |
| F6 | Low | Port collision during browser testing | Process note |
| F7 | High | Gemini-off headline comes from four fixed templates; 12/17 photos, including black-and-white ones, praise their "color palette" | **Open** (backend), new on 2026-10-28 |
| F8 | High | Focus and attention maps rendered as broken images (raw base64 mistaken for a path) | **Fixed** (`4db9e14`), pre-existing on `master` |

## 1. What was tested

| Item | Value |
|---|---|
| Release branch | `release/redesign-structured-critique` (local only, not pushed) |
| Worktree | `D:\helloworld\Snapgrade-release` |
| Release HEAD | `9f2dd61` "Merge main (result-page redesign) into the release branch" |
| Built from | `origin/master` `4b9e9c1` + PR #24 (`origin/backend/structured-critique` `ef9f7fc`) + `main` `f129bfa` |
| Uncommitted on the branch | `backend/tests/real_image_matrix.py` (stale category name fix, §4.2) and these docs |
| Gemini | **Off** for every run (`GEMINI_API_KEY` empty). No photo left the machine. |
| Tools | Python 3.11.9, FastAPI 0.141.1, Pillow 12.3.0, OpenCV 5.0.0, Node 26.5.0, Vite 8.1.4 |

Test photographs: the 17 JPEGs in `docs/assets/images/` of the main checkout (untracked there).
One `.mp4` in the same folder was skipped because the API accepts images only.

## 2. Stage 0 — Merge to one candidate

### 2.1 Steps

1. Created `release/redesign-structured-critique` from `origin/master` in a separate worktree, so the
   main checkout (with its uncommitted `README.md`) was not touched.
2. Merged PR #24 (`origin/backend/structured-critique`) with `--no-ff`: clean, commit `519db2d`.
3. Merged `main` with `--no-ff`: 16 conflicts, resolved as below, commit `9f2dd61`.

`master` on GitHub was **not** changed; PR #24 is still open.

### 2.2 Conflict resolution

| File(s) | Conflict | Resolution | Reason |
|---|---|---|---|
| `backend/prompt.txt` | Deleted on `master`, edited on `main` | Deleted | `master` uses `app/prompts/analysis.txt`; PR #24 ported the prompt rules there |
| `backend/app/services/analysis/gemini_analysis.py` | Timeout edited on both sides | Release side (60 s from PR #24) | Same intent, PR #24 version fits the new layout |
| `score_engine.py`, `tutorial_recommendation_engine.py`, their tests | Auto-merged `main`'s flat-backend edits into `master`'s moved files | Reverted to release side | `frame_work` number stripping and `helps_with`/`priority` are unnecessary in `master`'s canonical design (scores always come from the engine; `response.py` builds tutorial fields) |
| `App.jsx`, `UploadWorkspace.jsx`, `ResultRead.jsx`, `result-read.css`, `index.css`, `result-read.js`, `result-read.test.js`, `ResultPhotoViewport.jsx`, `tests/visual.spec.js`, `package.json`, `package-lock.json` | Added on both branches | `main` | The redesign. `result-read.js` also carries the "Final technical" label and YouTube thumbnail fallback; `ResultPhotoViewport` carries `data-object-fit` |
| `DiagnosticPanel.jsx`, `ResultDiagnosticSelector.jsx` | Added on both branches | `master` | Accessible tablist: arrow/Home/End keys, roving focus, `aria-controls`, tabpanel; same props as the redesign uses |
| `mistake-guidance.js` | Added on both branches | `master` (PR #24) | Word-start matching; `main`'s whole-word version wrongly rejected "Properly exposed" |
| `result-read.css` additions | — | Ported `master`'s tabpanel, keyboard-motion, focus and reduced-motion rules | Needed by `master`'s diagnostic components |
| `EvidenceAccordion.jsx`, `ui/morphic-navbar.tsx`, `result-curtain.js` + 2 tests, `upload-workspace.css` | Present only on `master` | Deleted | Retired by the redesign; would have returned as dead code |

### 2.3 Bug found and fixed during the merge

`master`'s `DiagnosticPanel` wraps the photo in a `result-read__diagnostic-tabpanel`. With only
`master`'s rule ported, the tabpanel grew to 774 px inside the 520 px hero photo box: the photo
was cropped edge to edge and the Image/Attention/Light/Focus/Composition tabs were pushed out of
view. Fixed by adding `min-height: 0` to the tabpanel rule (panel now 465 px, tabs visible).

Note for whoever reruns this: the first browser check was against `localhost:5174`, which was
already served by an unrelated process (PID 15188), so it showed the wrong code and looked fine.
The merged build was then served on `localhost:5190`, where the overflow appeared.

### 2.4 Stage 0 checklist

| Item | Status |
|---|---|
| Merge PR #24 into the candidate | Done locally (`519db2d`); PR #24 itself is still open on GitHub |
| Merge `main` and `master`, resolve `apps/web-page` | Done (`9f2dd61`) |
| Keep one `mistake-guidance.js` (PR #24's) | Done |
| `.gitignore` `lib/` rule | **Not changed** (stopped at the user's request). The release branch's `.gitignore` has no `lib/` rule, so the issue seen on `main` may not apply here; to be confirmed |
| Record previous production artifact IDs (backend/analyzer/landing) | **Not done**: needs access to the hosting dashboards |
| Push the release branch | **Not done** (local only) |

## 3. Stage 1 — Deterministic checks on the merged code

| Check | Command | Result |
|---|---|---|
| Backend unit + contract | `cd backend && python -m pytest -q` | **37 passed** |
| Backend real-image matrix | `cd backend && python tests/real_image_matrix.py` | **10/10 cases pass** after fixing a stale expectation (§4.2); failed before |
| Analyzer unit (clean `npm ci`) | `cd apps/web-page && npm test` | **58 passed, 0 failed** |
| Analyzer lint | `npm run lint` | Pass, 3 pre-existing warnings (`react(only-export-components)` in `toggle.jsx`, `button.jsx`, `ResultPhotoViewport.jsx`) |
| Analyzer build | `npm run build` | Pass |
| Landing build | — | **Not run** |

`master`'s previously failing analyzer test, "uses the brief category order and six-part
numbering for the complete Visual Breakdown", now **passes**: it expected the "Final technical"
label that the merge brought in from `main`.

Browser check (Chromium, preview result, dark theme): hero photo box 520 px with the photo
letterboxed and the mode tabs inside it; section index lists Read · Scores · Actions · Breakdown ·
Numbers · Improve; Arrow Right from Attention skips the unavailable Light mode and moves both
selection and focus to Focus.

## 4. Real-photo results (17 photos, Gemini off)

### 4.1 Method

Two throwaway scripts (kept outside the repository, in the session scratchpad):

- **`photo_pass.py`** posts every photo to `/analyze` through FastAPI's in-process `TestClient`
  (no server, no network) and checks: HTTP 200; all canonical sections (`metadata`, `overview`,
  `analysis`, `visual_breakdown`, `learning_next`, `tutorials`, `diagnostics`); the six category
  IDs; evidence geometry within 0..1 (reusing the matrix's own check); 1–4 tutorials with HTTPS
  YouTube URLs and `duration` equal to the catalog runtime. It saves each response as JSON.
- **`page_pass.mjs`** feeds each saved response through the release branch's
  `getResultReadModel`, `describeMetric` and `deriveMistakes`, i.e. exactly what the redesigned
  result page renders, and checks: headline and score present; change-one-thing present; every
  Breakdown row has a comment, tag or advice (never a bare number); every Numbers measurement has
  a plain-language meaning; three lessons with duration and thumbnail.

### 4.2 Backend results

All 17 photos: **HTTP 200, all checks pass**, 0.3–0.8 s per analysis on this machine
(`diagnostics.ai_status = not_configured`).

| Photo | Size | Overall | Comp | Light | Focus | Color | Subject | Technical | Brightness | Sharpness | Shadow clip | Highlight clip |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| 1784044056926 | 2134×1817 | 77 | 85 | 64 | 80 | 82 | 76 | — | 0.72 | 253.4 | 3.3% | 37.4% |
| 1784044056960 | 1896×1263 | 68 | 86 | 81 | **9** | 87 | 78 | — | 0.53 | 12.0 | 1.2% | 0% |
| 1784044057020 | 2818×3756 | 66 | 89 | 71 | **21** | 82 | 77 | — | 0.72 | 29.3 | 0.3% | 0% |
| 1784044143589 | 3024×4032 | 81 | 90 | 79 | 71 | 88 | 86 | — | 0.33 | 109.4 | 9.9% | 0.7% |
| 1784044143604 | 3024×4032 | 88 | 95 | 85 | 88 | 84 | 86 | — | 0.55 | 970.5 | 2.5% | 0% |
| 1784044143614 | 3024×4032 | 88 | 94 | 85 | 88 | 81 | 85 | — | 0.55 | 718.5 | 2.2% | 0% |
| 1784044143625 | 3024×4032 | 89 | 95 | 84 | 88 | 88 | 88 | — | 0.56 | 1276.9 | 1.3% | 1.4% |
| 1784044143642 | 2887×3332 | 88 | 97 | 84 | 88 | 84 | 87 | — | 0.58 | 522.1 | 1.7% | 0.1% |
| 1784044143660 | 2884×3845 | 86 | 95 | 85 | 84 | 86 | 87 | — | 0.55 | 318.6 | 0.2% | 0.2% |
| 1784044143684 | 3024×4032 | 81 | 99 | 68 | 88 | 79 | 86 | — | 0.22 | 391.3 | 37.4% | 1.5% |
| 1784044143725 | 3024×4032 | 88 | 94 | 86 | 88 | 83 | 86 | — | 0.47 | 537.3 | 0.2% | 0.5% |
| 1784044143763 | 3024×4032 | 87 | 95 | 85 | 88 | 79 | 85 | — | 0.55 | 945.9 | 3.5% | 0.1% |
| 1784044143779 | 3024×4032 | 88 | 95 | 83 | 88 | 87 | 87 | — | 0.39 | 798.2 | 13% | 1.6% |
| 1784044143804 | 2172×3212 | 84 | 94 | 82 | 74 | 84 | 86 | — | 0.37 | 156.2 | 1.4% | 3.4% |
| 20260312_110313 | 3024×4032 | 90 | 98 | 87 | 88 | 85 | 88 | — | 0.47 | 1008.3 | 2.1% | 4.2% |
| 20260312_132451 | 2700×3901 | 82 | 95 | 70 | 89 | 81 | 85 | — | 0.25 | 402.1 | 30.4% | 0.8% |
| Screenshot_20260314_200757_EZVIZ | 2400×1080 | 79 | 92 | 72 | 70 | 82 | 85 | — | 0.28 | 80.5 | 26.3% | 2.1% |

### 4.3 Result-page results

All 17 responses render every section of the redesigned page with content, and every measurement
in Numbers has a meaning. Per photo: 2 keep items, 14 Breakdown rows, 3 lessons with duration and
thumbnail. Fixes listed: 3, 3, 4 for the first three photos, 2 for `1784044143684`, 1 for
`20260312_132451` and the EZVIZ screenshot, 0 for the rest.

## 5. Findings

Severity: **High** = shows users something wrong; **Medium** = visibly hollow or placeholder
content; **Low** = test or tooling only.

### F1 · High · Focus score and "Soft" verdict misread hazy and minimalist photos

`1784044056960` (sepia boat silhouettes in haze) and `1784044057020` (black-and-white, mostly empty
sky) were inspected visually: both have crisp subjects. The backend still scores their **focus at
9 and 21/100**, dragging the overall scores to 68 and 66, and the Numbers section says
"Soft: likely camera shake, motion blur or missed focus."

Cause: the sharpness index measures edge detail across the whole frame. Fog, sky and still water
have almost no fine edges, so a deliberately simple scene reads like blur. The matrix shows the
same effect: its darkened (not blurred) variant scores 12.6.

Suggested fix:
- **Frontend (`metric-guide.js`), small:** stop asserting a cause. For example, "Little fine detail
  across the frame: soft focus, or a smooth scene like fog, sky or water."
- **Backend, larger:** measure sharpness on the subject or saliency region, not the whole frame,
  before it feeds the focus score.

### F2 · High · Added white borders read as blown highlights

`1784044056926` carries a white camera-app frame (Xiaomi 14 Civi / Leica watermark border). The
backend reports **37.4% highlight clipping** and mean brightness 0.72, so the page says
"Noticeable areas blown out to pure white" and "Bright overall… close to overexposed". The
clipped area is the border, not the photograph. The border also feeds composition and lighting.

Suggested fix:
- **Backend:** detect a uniform border and analyse the inner image (also improves composition).
- **Frontend, interim:** heavy clipping wording should allow for "a white border or background".

### F3 · Medium · "Final technical" is empty without Gemini

On all 17 photos the technical category has **no score** (`score_engine.categories.noise` is
`None`), **no metrics** (`CATEGORIES` gives it none; its rows only come from Gemini's
`technical.evidence`) and **no summary**. The Breakdown card shows the placeholder "No technical
characteristics reading was returned for this photograph." and the Scores bar list omits it.

Suggested fix: hide categories with no score, metrics or summary on the result page, or give the
local-CV path a basic technical reading (noise and resolution are already measurable).

### F4 · Medium · "Try this next" is hollow on 8 of 17 photos

Without Gemini, `response.py` only builds practice variations from the weakest metrics that have
a `try_this`. For well-scored photos there are none, so `try_this_next.status` is `insufficient`,
yet the redesign still renders the card with filler: "Practice session / Try three variations of
the same frame." with no variations. Affected: `…143589`, `…143604`, `…143614`, `…143625`,
`…143725`, `…143779`, `…143804`, `20260312_110313`.

Suggested fix: render the card only when there are variations or a real instruction.

### F5 · Low · Real-image matrix expected a renamed category (fixed, uncommitted)

`backend/tests/real_image_matrix.py` expected `post_processing`; `response.py` (and the frontend)
use `technical`. The manual matrix is not part of `pytest`, so it was already failing on `master`
unnoticed. Changed the expectation to `technical`; 10/10 cases pass. The change is in the release
worktree and not committed yet.

### F6 · Low · Port collision during browser testing

Port 5174 was held by an unrelated process. Use `--strictPort` and confirm `location.origin`
before trusting a browser check.

## 6. Not yet tested

| Plan stage | Gap |
|---|---|
| Stage 0 | Previous production artifact IDs; pushing the release branch; `.gitignore` decision |
| Stage 1 | Landing production build; the three new contract tests in the plan are covered by the scratchpad scripts, not yet by committed tests |
| Stage 2 | Gemini failure mocks (timeout at 35/59/61 s, 429, 5xx, malformed JSON) |
| Stage 3 | **Live Gemini prompt review.** This would send the test photos to Google's API, and one is a security-camera app screenshot; needs explicit approval |
| Stage 4 | Full browser journey with these photos (upload, Enter, loader, cancel, retry, PDF, theme, section index, accessibility) |
| Stage 5 | Mobile layout decision and tests |
| Stage 6 | Compatibility cells, abort and N=2 concurrency, CORS, rollout and rollback drill |
| — | `20260312_132130.mp4` (not an image; out of scope for `/analyze`) |

## 7. Recommended next steps

1. Decide on F1–F4. F1 (frontend wording), F3 and F4 are small frontend changes; F1 (backend) and
   F2 are backend scoring work that could follow this release if the wording is fixed now.
2. Commit the F5 matrix fix on the release branch.
3. Run Stage 4 (browser journey) with three or four of these photos, including the white-border
   and hazy ones.
4. With approval, run Stage 3 live Gemini on photos without personal or security-camera content.

## 8. Update 2026-10-28 — fixes and Stage 4 browser journey

### 8.1 Commits added to the release branch

| Commit | Change | Finding |
|---|---|---|
| `af80d22` | Real-image matrix expects `technical` | F5 |
| `253c392` | Numbers verdicts name both readings: low sharpness says "soft focus, or a smooth scene like fog, sky or water"; heavy highlight clipping allows "a white border or background"; heavy shadow clipping allows "a deliberate silhouette or dark background". New test | F1 (frontend), F2 (interim) |
| `62dcdb8` | Categories expose `hasReading`; the Breakdown skips placeholder-only categories; Change/Try cards render only with real content; the Actions grid sizes to the cards shown. New test | F3, F4 |
| `4db9e14` | `assetUrl` wraps raw base64 JPEGs (they start with `/9j/`, which was mistaken for a site path). New test | F8 |

After these: backend 37 passed; analyzer 61 passed; lint unchanged (5 pre-existing warnings,
including 2 in the vendored Kokonut components); production build OK. Re-running the 17 saved
responses through the page model gives, for example, `1784044056960` sharpness 12 → "Little fine
detail across the frame: soft focus, or a smooth scene like fog, sky or water."

### 8.2 Stage 4 browser journey (Chromium, 1366×679, Gemini off)

Setup: release backend on `127.0.0.1:8000` started with `GEMINI_API_KEY` empty (the worktree has
no `.env`); release analyzer on `localhost:5173`, an origin the backend's CORS allows (confirmed:
`access-control-allow-origin: http://localhost:5173`). Photos added through the real file input.

| Check | Result |
|---|---|
| Upload page fits the screen, no scroll | Pass (page height 679 = viewport, width 1366) |
| Default theme dark; Analyze disabled with no photo | Pass |
| Add `1784044056926` → row "Uploaded ✓", zone "Photo added / Remove it to choose another photo", Analyze enabled | Pass |
| Enter sends exactly one `POST /analyze` | Pass (one request, 200) |
| Result page: Read, Scores, Actions, Breakdown, Numbers, Improve all present | Pass |
| No "Final technical" placeholder; no hollow "Try this next" | Pass (F3/F4 fixes) |
| Numbers verdicts use the new wording | Pass (37.4% clipping → "…blown highlights, or a white border or background") |
| Focus map and Focus/Attention overlays render | **Failed, then fixed** (F8, `4db9e14`); all four images load after the fix |
| Diagnostic tabs: arrow keys skip unavailable Light | Pass |
| Pull-cord → light theme, stored; reload keeps theme and result | Pass |
| "Analyze another photograph" → clean upload page, stored result cleared | Pass |
| Unsupported file (`video/mp4`) → row "Not JPEG, PNG or WEBP", no Retry, Analyze disabled; Clear removes it | Pass |
| Loader → Cancel: overlay shown with Cancel focused; cancel closes it quietly, photo kept | Pass |
| Backend 503 → overlay with the backend message, "Your photo is still added", Retry/Close | Pass |
| Backend unreachable → "Could not reach the critique service…" | Pass |
| Retry after both failures reaches the result page without re-adding the photo; one request per action | Pass (4 calls: slow, error, offline, real) |
| PDF report (`POST /critique-pdf` with saved analysis and photo; not downloaded through the browser) | Pass: 200, `application/pdf`, `%PDF-` signature, 7 pages open in pypdf, score present, filename `<photo>-critique.pdf`; malformed JSON → 400 |

The 503, unreachable and slow cases were simulated by wrapping `window.fetch` in the page; the
success cases used the real backend.

Not covered in Stage 4: automated accessibility scan (no axe tooling in this environment), a
non-Chromium browser, and mobile widths (Stage 5).

### 8.3 What the journey showed about F1, F2 and the new F7

The page-model check in §4 only covered the Numbers section. In the browser, the rest of the page
is built from the backend's Gemini-off text, and it inherits the same misreadings:

- **F1 (hazy photo `1784044056960`):** Focus card "9/100 · Blurry · This looks soft rather than
  crisp, most likely from camera shake or a missed focus point"; supporting line "a severe lack of
  sharpness"; Change one thing "Raise your shutter speed… or use a tripod". The silhouettes are
  sharp. Only the Numbers wording is fixed so far.
- **F2 (white-border photo `1784044056926`):** Change one thing reads "The image is overexposed,
  leading to blown-out highlights… (e.g., in skies or white shirts)" and Try this next recommends
  −0.4 to −0.8 EV, all driven by the camera-app border. The focus map's brightest "detail" is the
  border's Xiaomi/Leica text.
- **F7 (new, High):** with Gemini off, `first_impression` comes from four fixed templates in
  `backend/app/services/vision/local_cv_engine.py` (around line 951). Across the 17 photos there are
  only 8 distinct texts, and 12 photos open with "an aesthetically pleasing color palette with very
  harmonious tones", including black-and-white photos. This sentence is the result page's headline.

Recommendation: these three are backend fallback-quality issues. Either fix them before release
(region-based sharpness, border detection, intent-aware templates that respect monochrome), or
make Gemini-off a degraded mode the UI labels as such, so users do not read template text as a
critique of their photo.

### 8.4 Not yet tested (updated)

| Plan stage | Gap |
|---|---|
| Stage 0 | Previous production artifact IDs; pushing the release branch; `.gitignore` decision |
| Stage 1 | Landing production build |
| Stage 2 | Gemini failure mocks (timeouts at 35/59/61 s, 429, 5xx, malformed JSON) |
| Stage 3 | Live Gemini prompt review (needs approval: sends the test photos to Google) |
| Stage 4 | Accessibility scan; non-Chromium smoke |
| Stage 5 | Mobile layout decision and tests |
| Stage 6 | Compatibility cells, abort and N=2 concurrency, rollout and rollback drill |
