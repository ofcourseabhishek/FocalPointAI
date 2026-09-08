# Providers and Sharing Log

## Council mode

Full (planning-only; no production implementation).

## Provider mapping

- Codex: repository expert and proposal author.
- External A: Claude web (proposal completed).
- External B: Gemini web (proposal completed in two messages after an interrupted first response).
- External C: Grok web (proposal completed after the user personally completed the provider's age-verification gate).

## Sharing log

- Codex inspected repository-local source, documentation, package manifests, tests, and filename-only secret-scan results.
- External reviewers, if authorized and available, will receive only `00-specification.md` plus the generic proposal/critique response contract.
- Explicitly excluded: `.env` contents, credentials, user/customer images, private data, repository archives, and unrelated code.
