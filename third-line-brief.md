# Third Line — Landing Page Redesign Brief (Final)

Rebuild the FocalPointAI landing page as **Third Line**. Design is approved — build to this spec exactly. Reference implementation: `third-line-v3.html` (working HTML/CSS/JS mockup — match its tokens, structure, and behavior; don't reinvent from scratch).

---

## 1. Install (run in `frontend/`)

```bash
# KokonutUI components
npx shadcn@latest add https://kokonutui.com/r/utils.json
npx shadcn@latest add https://kokonutui.com/r/file-upload.json

# Bklit UI charts (for the analysis/results screen, not landing — install now, use later)
npx shadcn@latest add @bklit/radar-chart
npx shadcn@latest add @bklit/gauge-chart

# Animation
npm install animejs
```

Skills expected in `.agents/skills/`: `emil-design-eng`, `animate`, `review-animations`, `find-animation-opportunities`, `pick-ui-library`. Consult `animate` and `review-animations` for every motion decision below.

---

## 2. Design tokens

Pulled from the live site (`focalpoint-ai.vercel.app`) — do not substitute other hues.

```css
:root {
  --bg: #FAFAFC;
  --surface: #FFFFFF;
  --surface-2: #F1F1F6;
  --text: #12131C;
  --text-dim: #6B6B80;
  --line: rgba(18, 19, 28, 0.10);
  --indigo: #4F46E5;        /* primary accent — CTAs, headline emphasis */
  --indigo-light: #818CF8;  /* gradient partner for indigo */
  --indigo-pale: #E8E7FD;   /* hover/active backgrounds */
  --amber: #F0A400;         /* secondary accent, from the shutter logo mark */
}
```

**Type:**
- Display: `Fraunces` (serif, weight 500; use for headlines only)
- Data/label: `JetBrains Mono` — eyebrow labels, slide tags/scores, footer
- Body: `Inter` — paragraph copy, UI text

**Background is light**, not dark. This reverses the earlier dark-theme direction — confirm no leftover dark tokens (`#14100D` etc.) carry over from prior exploration.

---

## 3. Page structure

```
nav (thin, border-bottom only — no button)
├── left: wordmark (grid-mark icon + "THIRD LINE")
└── right: "How it works" · "Tutorials" · "API" — text links only, no CTA button

HERO (two-column, light bg)
├── left: eyebrow "Measured, not guessed" · headline (indigo/periwinkle
│         gradient on the emphasis line) · subhead · primary CTA
│         ("Analyse a photo" → scrolls to #upload) + ghost link
└── right: VERSATILITY SLIDESHOW
      - 4 slides, auto-crossfade (~4s each), each = illustrated/photo
        genre thumbnail + genre tag + score badge
      - genres: Portrait, Landscape, Low light, Macro
      - purpose: prove the model handles range, not just one photo type

UPLOAD SECTION (id="upload", separate section, surface-2 background)
├── heading + one-line subhead
└── upload-panel (centered, max-width ~560px)
      - dropzone (KokonutUI file-upload base): drag/drop + click-to-browse
      - on file select: dropzone hides, real image preview shows
        (FileReader-based, actual uploaded photo — not a placeholder),
        with a swap/× button to pick a different file
      - file-preview info row: filename + size
      - "Get Review" button: indigo→indigo-light→amber gradient,
        disabled until a file is selected

FOOTER
└── wordmark (quiet) · "Apache-2.0" text linking to LICENSE · GitHub link
    No motion here — quietest part of the page.
```

No floating/morphing button, no separate "How It Works" step-by-step section, no nav CTA — all removed from earlier drafts per approved direction.

---

## 4. Component notes

- **Dropzone**: the `<label>` wrapping the dropzone MUST be `display:flex` (or block) — an inline label with block children breaks the dashed border into fragments. This was an actual bug in the mockup's first pass; don't reintroduce it.
- **Image preview**: use `FileReader.readAsDataURL()` to show the real selected photo in a 16:10 frame, not a generic gradient placeholder. Include a small × button to clear/reselect.
- **Gradient button**: `background-position` animates on hover (not a static gradient) — at rest it should show indigo dominant with amber just entering at the edge; on hover it shifts to bring more amber in. Disabled state: flat `--line` background, no shadow, `--text-dim` text.
- **Slideshow**: pure CSS `@keyframes` opacity cycle is sufficient — no JS library needed. Stagger each slide's `animation-delay` evenly across the total cycle length. Under `prefers-reduced-motion: reduce`, disable the animation and freeze on the first slide (don't remove the slideshow entirely).
- Replace the mockup's illustrated SVG placeholder slides with real sample output from the app (actual analyzed photos + their real scores) once available — the illustrated versions were a stand-in to avoid placeholder photo licensing during design review.

---

## 5. Animation rules (enforce via `animate` + `review-animations` skills)

- `transform` and `opacity` only for all motion.
- `ease-out` for anything entering — never `ease-in`.
- Button/hover interactions stay under 300ms. The slideshow crossfade can run longer (part of its 4s hold per slide).
- Every animation ships with its `prefers-reduced-motion` fallback in the same commit.
- Run `review-animations` before calling the page done.

---

## 6. Copy reference (from approved mockup — adjust only if needed)

- Eyebrow: "Measured, not guessed"
- Headline: "Every frame, **read precisely.**" (emphasis line in gradient)
- Subhead: "Portrait, landscape, macro, low light — Third Line measures whatever you shoot, and explains what to do next in plain photography language."
- Upload heading: "See what your photo measures"
- Upload subhead: "Drop in any shot — the same evidence-based critique runs on every genre."
- Footnote under button: "Analysed locally · nothing stored"

---

## 7. Reference file

`third-line-v3.html` — working mockup with all of the above implemented (light theme, slideshow, fixed dropzone, real preview, gradient button, correct nav). Treat it as ground truth for tokens, spacing, and interaction behavior.
