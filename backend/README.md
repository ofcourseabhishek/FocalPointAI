# Snapgrade backend

The public ASGI entrypoint remains `main:app`, so existing deployment commands
continue to work while implementation code lives in the `app` package.

```sh
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## API contract

`POST /analyze` accepts one multipart field named `file`. Supported uploads are
JPEG, PNG, and WebP images up to 20 MiB. A successful response contains these
canonical top-level sections:

```text
metadata
overview
analysis
visual_breakdown
learning_next
tutorials
diagnostics
```

The response temporarily retains the legacy analysis fields for compatibility
with existing PDF and external consumers. New UI code should use only the
canonical sections. Spatial evidence is normalized to the original image in
the range `0..1`; unsupported or invalid geometry is omitted.

The local tutorial catalog is ranked from the analysis output and returns at
most four unique lessons. Each canonical lesson includes a real HTTPS YouTube
URL and the metric IDs it helps address.

## Configuration

- `GEMINI_API_KEY` enables Gemini analysis. If absent, the existing local-CV
  fallback remains operational.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and
  `SMTP_SENDER` are used by the separate email helper.

Do not commit environment files or credential values.

## Verification

```sh
pytest -q
python -m pytest -q
python tests/real_image_matrix.py
```

The real-image matrix uses repository photographs and temporary derived
variants to verify the canonical category set, tutorial integrity, and
normalized geometry across orientation, exposure, focus, and colour changes.
