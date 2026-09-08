---
name: Snapgrade Upload Workbench
description: A restrained photography workbench for beginning a new analysis.
colors:
  canvas: "#f3efe7"
  surface: "#e8e1d7"
  ink: "#2a211b"
  secondary: "#5a4636"
  muted: "#7b6a5c"
  gold: "#b8924a"
  gold-text: "#856324"
  gold-soft: "#d2bc8a"
  line: "#d8d0c4"
  error: "#8b3027"
typography:
  body:
    fontFamily: "Neue Haas Grotesk Display, Helvetica Neue, Helvetica, sans-serif"
    fontWeight: 400
  headline:
    fontFamily: "Neue Haas Grotesk Display, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "clamp(32px, 3vw, 36px)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  label:
    fontFamily: "Neue Haas Grotesk Display, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.12em"
  result-wordmark:
    fontSize: "21px"
  result-label:
    fontSize: "11px"
  result-metric:
    fontSize: "12px"
  result-intro:
    fontSize: "15px"
  result-body:
    fontSize: "16px"
  result-statement:
    fontSize: "clamp(34px, 3.05vw, 42px)"
  result-overall-score:
    fontSize: "clamp(40px, 3.4vw, 48px)"
  result-category-score:
    fontSize: "clamp(36px, 3vw, 42px)"
  result-interpretation:
    fontSize: "clamp(26px, 2.15vw, 30px)"
  result-mobile-statement:
    fontSize: "clamp(33px, 10vw, 40px)"
  result-mobile-interpretation:
    fontSize: "clamp(26px, 7.5vw, 30px)"
rounded:
  media: "16px"
  result-media: "12px"
  pill: "999px"
  action: "0"
spacing:
  header: "64px"
  action-height: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.action}"
    padding: "12px 16px 12px 18px"
    height: "{spacing.action-height}"
  dropzone:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.media}"
---

# Design System: Snapgrade Upload Workbench

## Overview

**Creative North Star: "The Photography Workbench"**

This is the separate upload surface, not the landing page or legacy results UI: a quiet, neutral workspace that makes one photograph the object of attention. The canvas and minimal 64px wordmark header leave the process feeling deliberate rather than promotional.

The image area is the static visual anchor; controls sit asymmetrically to its right until the mobile layout stacks them. A local preview always precedes the explicit analysis action.

**Key Characteristics:**
- Neutral paper canvas, dark ink, and restrained structural lines.
- One large framed photograph field and terse action copy.
- Calm state changes rather than decorative movement.

## Colors

Warm archival neutrals and dark brown carry the workbench; gold is reserved for active state, evidence markers, and significant technical detail. The error red remains reserved for validation or request failure.

**Brown defines the interface; gold marks significance.** Keep most of the screen in canvas and surface tones. Brown is the primary ink and decisive action color; gold appears only on selected controls, annotation points, small score details, and numbered evidence markers.

**Gold text accessibility:** Use `gold-text` (`#856324`, 4.81:1 on canvas) for all readable text on the light canvas. Reserve `gold` (`#b8924a`) for graphical elements (strokes, fills, point markers, underline indicators) and text on dark backgrounds (curtain, ink buttons) where it passes comfortably at 5.44:1.

## Typography

**Display Font:** Neue Haas Grotesk Display (with Helvetica Neue and Helvetica fallbacks)

**Character:** Compact, editorial sans-serif type with tight headlines and small, tracked operational labels.

- **Headline:** regular, 32–36px, 1.08 line-height; analysis state title.
- **Body:** regular; filenames, instructions, and progress copy.
- **Label:** medium, 10px, 0.12em tracking, uppercase; use for `NEW ANALYSIS`.

## Layout

Use a 64px header containing only the wordmark. The desktop main column is capped at 1280px, with 78px top and 72px bottom padding; its image-first grid is `minmax(0, 840px)` beside a 260–300px action column with a 36–56px gap. The media field is 440–560px high.

At 960px the action column narrows to 250px. At 760px, the content becomes a single column within a 560px maximum, the media field is limited to 40vh/340px, actions fill the width, and photo dimensions and file size are hidden.

## Elevation & Depth

Flat by default. Separation comes from the one-pixel line and a slightly darker media surface, not cards or shadows. Dragging the media field temporarily changes its border to ink and scales it to 1.015.

## Shapes

The photograph field has gently rounded corners (16px); actions are square-cornered. Borders are thin and structural. The frame icon uses square line caps and joins to keep the field technical and spare.

## Components

### Buttons

The primary action is an ink rectangle, 48px high, with a trailing arrow and compact asymmetric padding. Hover uses a lighter charcoal; press scales to 0.97. The quiet action is an underlined-on-hover muted text control with a 44px target. Keyboard focus uses a 2px muted-ink outline offset by 4px.

### Dropzone

The dropzone is the media frame: a surface-toned, 16px rounded field with a one-pixel line and 440–560px desktop height. It holds either the empty frame mark and prompt or a contained local preview; it is not a decorative card.

### Navigation

The header is a single 21px medium-weight `snapgrade` wordmark with no navigation controls. It is a 64px high, bottom-bordered return path to the landing site.

## Do's and Don'ts

### Do:
- **Do** keep `NEW ANALYSIS` visible above the work area.
- **Do** require a real local preview before exposing the analysis decision.
- **Do** preserve the image-left/actions-right desktop asymmetry and the mobile stack.
- **Do** respect reduced-motion settings by removing state transitions, scaling, and spinner animation.

### Don't:
- **Don't** fold landing-page marketing or legacy result-view styling into this workbench.
- **Don't** add dashboard cards, shadows, or competing color accents around the photograph.
- **Don't** show photo dimensions or file size in the compact mobile layout.

## Result Analysis Extension

The result view shares the same canvas, ink, wordmark, structural lines, and media-first restraint, but uses a broader editorial type scale. Its first viewport pairs the analyzed photograph with a narrow written read; deeper analysis keeps the same photograph sticky while evidence-linked categories scroll alongside it.

- Use 11px uppercase labels and 12px metric rows for operational detail.
- Use 26–30px interpretation copy, 36–42px category scores, and 40–48px overall scores.
- Keep result media at a 12px radius so overlays read as technical evidence rather than upload controls.
- Keep the desktop frame photograph pinned at 134px with a 580px column and a viewport-aware media ceiling; category handoffs are content-driven with roughly 108px between the final evidence row and the next category heading.
- Evidence layers change with opacity only: the departing layer fades over 150ms and the arriving layer over 220ms with the standard strong ease-out curve.
- Color prefers an explicitly supplied palette and endpoint labels over generic region geometry.
- On mobile, repeat the photograph before each category analysis; do not pin or scroll-snap it.
- Never infer an overlay, metric, or score from prose. Show only evidence returned by the analysis contract; when a numeric score is not trustworthy, omit the score instead of rendering `N/A`.
