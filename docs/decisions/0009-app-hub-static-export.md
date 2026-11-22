# ADR 0009 — App Hub static export and production worker bundling

**Status:** Accepted (pilot)
**Date:** 2026-11-22
**Decision scope:** Optional static export of the local editor for the LopesMoreno App Hub; production Web Worker bundling fix

## Context

The owner wants to share the unfinished local editor with selected testers through the LopesMoreno App Hub. The App Hub serves independently built static packages at `/apps/projects/<id>/` through a PHP gate on Hostinger. Public, Unlisted and Hidden packages may live in the web root; Passcode packages live in a protected folder outside `public_html`. The App Hub has no Node runtime and no database. Its rules are recorded in the App Hub repository (`docs/icm/app-hub.md`).

The Cocolla editor is already local-only. It uses no API or database, keeps editor preferences in `localStorage`, and saves and reopens work through JSON export/import. Its Vite build, however, emitted root-relative `/assets/…` URLs, which cannot work under a sub-path.

While verifying this, a pre-existing production defect was found. `ImageImportDialog` declared `new URL("../workers/image-conversion.worker.ts", import.meta.url)` separately from `new Worker(...)`. Vite only bundles workers written as `new Worker(new URL(...), ...)` in a single expression; otherwise it treats the `.ts` file as a plain asset. Every production build therefore inlined the raw TypeScript worker source as a `data:video/mp2t` URL, and **image import never completed outside `npm run dev`**. Earlier browser QA had run against the dev server, so this went unnoticed.

## Decision

- **The build stays configurable through environment variables, with the old defaults:**
  - `COCOLLA_BASE` (default `/`; it must be an absolute path that starts and ends with `/`);
  - `COCOLLA_SOURCEMAP` (default `true`);
  - `COCOLLA_OUT_DIR` (default `dist/web`).
  - `npm run dev` and `npm run build` behave as before.
- **`npm run package:apphub` builds the App Hub package** with base `/apps/projects/cocolla/` and no source maps into `dist/apphub/cocolla/`. It adds `app.json` (id `cocolla`, status `alpha`, `spa: true`, version `<package version>-<commit>`) and `icon.svg` (the existing favicon mark).
  - It then verifies the package: every URL under the base resolves, the bundled worker is present, there are no source maps, TypeScript, environment or dependency files, and every name passes the App Hub's safety rules.
  - It writes `UPLOAD.txt` and `SHA256SUMS.txt` beside the package.
- **The worker is created as `new Worker(new URL(...), { type: "module" })` in one expression**, with `worker.format: "es"`, so production builds emit a real worker chunk.
- **No backend, database, router, service worker or new dependency is introduced.** The export is an additional distribution target. The planned Synology container deployment (invariant 10) remains the long-term production path.

## Consequences

- **Regression coverage:** `npm run test:export` (part of `npm run check`) runs real builds and checks:
  - the default build (base `/`, source maps on, worker chunk);
  - the App Hub build (all assets and the worker under the base, no source maps);
  - that invalid base/source-map values are rejected;
  - that the verifier catches broken packages.
- `scripts/apphub-browser-check.mjs <url>` drives headless Chrome for a served build:
  - editor load, drawing, JSON export/import, image import through the worker, reload, SPA deep link;
  - no failed requests, console errors or requests outside the base.
  - It is a manual QA script, because it needs a browser and a server.
- **Behind the App Hub,** the editor shares its origin's `localStorage` with the host site. Only renderer preferences are stored, under Cocolla's versioned key.
- **The App Hub does not make the editor multi-user or persistent.** Testers keep their work with Export JSON; nothing is stored on the server.
- **Passcode protects access to the unfinished app, not confidential data.** The editor contains no user data.

## References

- [ADR 0006 — Local image-to-pattern conversion](0006-local-image-to-pattern-conversion.md)
- [Vite: Web Workers (`new Worker(new URL(...))`)](https://vite.dev/guide/features#web-workers)
- App Hub package rules: `jlopesmo/lopesmoreno-web`, `docs/icm/app-hub.md`
