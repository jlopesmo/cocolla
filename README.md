# Cocolla

Cocolla is an embroidery and cross-stitch design application. The current local application provides a functional full-cross pattern editor backed by the standalone, versioned Cocolla stitch engine. Multi-user persistence, authentication, imports from images, progress tracking, and deployment remain future work.

## Run the editor

Prerequisite: Node.js 24 LTS.

```text
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. The editor automatically fits patterns to the workspace and supports engine-backed 90°/180° rotation. It remains local-only in COC.2: use **Export JSON** to save a pattern and **Import** to reopen a valid Cocolla pattern document. No browser or server database persistence is claimed.

## Commands

- `npm run dev` — start the Vite development server.
- `npm run build` — compile the engine and build the production web bundle.
- `npm test` — run engine and editor tests.
- `npm run check` — run strict typechecking, all tests, the export regression tests, and engine benchmarks.
- `npm run package:apphub` — build the static LopesMoreno App Hub package in `dist/apphub/cocolla/` (base `/apps/projects/cocolla/`, no source maps; see [ADR 0009](docs/decisions/0009-app-hub-static-export.md)).
- `node scripts/apphub-browser-check.mjs <url>` — headless-Chrome functional check of a served build.

Architecture and verified implementation status are recorded under `docs/architecture/`, `docs/decisions/`, and `docs/icm/`.

Created with nexOS.
