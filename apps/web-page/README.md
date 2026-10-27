# Snapgrade application

The Vite application is separate from the editorial landing site in
`apps/landing-page`. Its entry screen is a photography workbench: image on the
left, instructions and actions on the right. On mobile these stack.

## Local development

```sh
npm install
npm run dev
```

The existing FastAPI service defaults to `http://127.0.0.1:8000`.
Configure `VITE_BACKEND_URL` for another API origin and `VITE_LANDING_URL` for the
wordmark's marketing-site destination (default `https://snapgrade.com`). Both
are public, build-time configuration, not secrets.

## Upload contract

- Choose or drop exactly one JPEG, PNG, or WebP, up to 20 MiB (shown as 20 MB).
- Preview and dimensions are prepared locally. Selecting/replacing a file does
  not contact the API. A failed replacement retains the last valid photograph.
- Only **Analyze photograph** sends the file, as multipart field `file`, to
  `POST /analyze`. No account is required by the current endpoint.
- The photograph stays in place while the request is pending. The interface
  does not simulate a percentage or claim server-side stages it cannot observe.
- Cancel stops waiting in the browser; it does not guarantee server-side work
  or third-party processing has stopped.
- Successful responses use the existing analysis result view and PDF workflow.
  Redesigning the result view is a separate task.
- The canonical backend response is normalized in `src/lib/result-read.js`;
  `ResultRead.jsx` consumes the resulting presentation model.
- A bounded WebP preview, image dimensions, and the successful result are kept
  in session storage so the Result page survives a same-tab refresh. Storage
  failure never prevents a completed result from being shown.
- In development, `/?preview=result` opens the deterministic Result preview.

## Privacy and release boundary

The upload screen deliberately says the photograph stays on the device **until
analysis**. It does not promise deletion, private server storage, or that no
third party processes the photograph. Review and harden the backend's image,
EXIF, temporary-file, provider-retention, and CORS handling before making
broader claims.

The intended deployment split is marketing at `snapgrade.com`, this app at
`app.snapgrade.com`, and FastAPI at `api.snapgrade.com`. These are deployment
targets, not domains configured by this change. Deploy this directory as its
own Vercel project, point `VITE_BACKEND_URL` to the API, and set the landing
site's existing `NEXT_PUBLIC_ANALYZER_URL` to the application origin.

## Checks

```sh
npm run build
npm run lint
npm test
```

Visual and integration checks should use local fixtures and a local stub API,
not paid analysis or personal photographs.
