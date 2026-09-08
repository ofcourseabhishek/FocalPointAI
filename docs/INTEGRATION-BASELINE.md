# Integration baseline

Captured before the backend package reorganization on 2026-09-03. This records the behavior of the current working tree, which already contained uncommitted user changes.

## Verification

- `pytest -q` from `backend`: 24 passed, 1 Starlette/httpx deprecation warning.
- `python -m pytest -q` from `backend`: 24 passed, 1 Starlette/httpx deprecation warning.
- `python -m uvicorn main:app --host 127.0.0.1 --port 18765`: started successfully.
- `GET /`: HTTP 200, `{"status":"ok","app":"FocalPointAI Backend"}`.

The documented deployment entrypoint is:

```text
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Public routes before reorganization

- `POST /analyze`: full photograph analysis upload.
- `POST /image-metadata`: lightweight upload metadata.
- `GET /tutorials`: local curated tutorial catalog.
- `POST /tutorial-recommendations`: catalog recommendations for an analysis payload.
- `POST /critique-pdf`: downloadable PDF for an existing result.

There was no separate upload-only route. The image upload used by the product was `POST /analyze`.

## Analyze response before normalization

The local-CV fallback response returned these top-level keys:

```text
advanced_cv
ai_status
aspects
exif_analysis
filename
first_impression
image_statistics
intent_profile
mode
overall_rating
score_engine
suggested_edits
tutorial_recommendations
```

The response did not yet contain the canonical `metadata`, `overview`, `analysis`, `visual_breakdown`, `learning_next`, `tutorials`, and `diagnostics` sections.

Tutorial recommendations already contained a title, `youtube_link`, `video_id`, thumbnail, creator, topic objective, reason, and match diagnostics. The frontend did not render them because its adapter did not read `tutorial_recommendations` or `youtube_link`.

## Resource and environment baseline

- Gemini prompt: `backend/prompt.txt`, resolved relative to `gemini_analysis.py`.
- Tutorial catalog: `backend/tutorials_catalog.json`, resolved relative to `tutorial_recommendation_engine.py`.
- CV cascades: `backend/cascades`, resolved relative to `local_cv_engine.py`.
- Backend environment variable names present or documented: `GEMINI_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SENDER`.
- Frontend environment variable names documented or used: `VITE_BACKEND_URL`, `VITE_LANDING_URL`, `VITE_SHOW_LEGACY_SCANNER`.

No secret values are recorded here.
