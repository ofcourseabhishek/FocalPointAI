# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Photographers (from beginners to enthusiasts) looking to improve their technique. They are often frustrated by subjective feedback or generic AI critiques that don't explain the "why" or "how" of improvement. They need objective, actionable guidance based on actual photographic principles.

## Product Purpose

FocalPointAI (rebranding to **Third Line**) is an AI-assisted photography coach that turns every photograph into a personalized learning experience. It exists to provide structured, evidence-based feedback that helps photographers practice the right skills and improve their craft. Success means a user understands exactly why an image works (or fails to work) and has a clear next step for improvement.

## Positioning

Unlike generic AI image critics, Third Line uses deterministic computer-vision measurements (OpenCV) to extract visual evidence and metadata. It connects concrete observations to actionable steps and recommends focused learning material from a curated local catalog, without relying exclusively on a cloud model's subjective text.

## Operating Context

- **Workflow:** Upload a photo -> system measures visual evidence (exposure, contrast, saliency, composition, EXIF) -> user reads critique -> user follows recommended tutorial/exercise.
- **Environment:** Web application, capable of working locally or deployed.
- **Artifacts:** A shareable, multi-page PDF critique report containing the photograph, scores, recommendations, metadata, and tutorial links.

## Capabilities and Constraints

- **Functionality:** Image upload (JPEG, PNG, WebP), OpenCV analysis (exposure, contrast, saturation, sharpness, clutter, color palette, saliency, EXIF), deterministic scoring, optional Gemini narrative explanation, tutorial recommendations, and PDF generation.
- **Constraints:** Maximum file size of 15 MB. No authentication, database, analysis history, or cloud image storage (stateless). RAW camera formats are not supported.
- **Terminology:** "Third Line" (new brand name for the landing page), "FocalPointAI" (legacy name/engine).

## Brand Commitments

- **Name:** Third Line (landing page/brand)
- **Voice:** Objective, educational, practical, and plain-language.
- **Design Tokens:** Strict adherence to the approved Third Line light theme (`--bg: #FAFAFC`, `--surface: #FFFFFF`, `--indigo: #4F46E5`, `--amber: #F0A400`, etc.). Background is light.
- **Typography:** Fraunces (Display), JetBrains Mono (Data/Labels), Inter (Body).
- **Motion:** Minimal, using opacity/transform with `ease-out`, honoring `prefers-reduced-motion`.

## Evidence on Hand

- **Data/Logic:** Fully functional FastAPI backend with OpenCV local CV engine, scoring engine, and intent-aware evaluation.
- **Assets:** `third-line-v3.html` (reference mockup), demo photographs, product walkthrough clips, and documentation.
- **Absences:** No database or persistence. No fabricated testimonials or claims.

## Product Principles

1. **Measured, Not Guessed:** Rely on local visual evidence and EXIF data rather than opaque AI generation.
2. **Actionable Over Abstract:** Every observation must tie to a concrete improvement step or practice exercise.
3. **Transparent Execution:** Fall back to local capabilities smoothly if external narrative APIs (Gemini) are unavailable.
4. **Focused Learning:** Guide the user to improve their craft through curated tutorials rather than just delivering a score.
