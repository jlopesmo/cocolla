# Cocolla Current State

**As of:** 2026-10-18

## Detected facts

- Project ID: `cocolla`
- Created as a framework-neutral blank project by nexOS Project Creator.
- Milestone 1 was squash-merged to `main` through GitHub PR #1 at commit `8a679bccdae8e116af37aca23466da6f28db47d7`.
- COC.2 implementation branch: `feat/coc2-visual-pattern-editor`.
- COC.4.1 was squash-merged through GitHub PR #3 at commit `d0a4c594ad66444f046f1be341d24eb51f595a14`.
- COC.4.2 was completed when GitHub PR #5 was squash-merged to `main` at commit `cea02eb66ef0cd8624cb3d54be4a656ebcadfb7e`.
- COC.4.3 Stage 1 is implemented on `feat/coc4-thread-catalog-foundation` and is not merged.
- Architecture approved on 2026-10-18.

## Status

COC.1, COC.2/COC.2.1, COC.4.1, and COC.4.2 are merged. COC.4.3 Stage 1 is implemented and validated on its isolated feature branch: catalog-neutral search/lookup/matching, portable thread assignments, explicit logical-color replacement, unresolved-entry behavior, and editor integration use a small synthetic catalog only. No verified DMC data, new dependency, backend, or persistence work is included.

### Implemented

- Strict TypeScript 5.9.3 build on Node 24 LTS with no engine runtime dependency.
- Version 1 pattern document TypeScript contract, JSON Schema, runtime validation, canonical serialization, and explicit errors.
- Safe-integer design coordinates with 1024 units per fabric cell by default; only the full-cross technique imposes grid alignment.
- Stable caller-supplied stitch identifiers and immutable add, remove, move, recolor, and transactional batch commands.
- Explicit migration pipeline with an unreleased version 0 fixture migrated to version 1.
- Full-cross front geometry, route-option interface, deterministic naive route, and clearly labeled heuristic back estimate.
- Preservation of unsupported technique payloads during round trips; interpretation fails explicitly.
- Unit, deterministic property-style, regression-performance, and standalone benchmark coverage.
- React 19.3.1 and Vite 8.3.4 local application under `apps/web`, using the existing contracts and engine directly.
- Responsive creative-editor shell with top toolbar, collapsible design/inspector sidebars, color palette, technique controls, and explicit local-file/unsaved status.
- Layered Canvas 2D rendering with a 2× high-DPI cap, fabric grid, engine-derived full-cross geometry, viewport culling, pan, zoom, fit, hover, selection, and optional symbols.
- Actual-container automatic fit and balanced centering on first load, new/import/rotation, explicit Fit, and fit-mode resizes; manual pan/zoom is preserved across later workspace resizes.
- Pointer-anchored Canvas wheel zoom without a modifier key, with normalized wheel delta modes, bounded zoom, and page-scroll prevention scoped to handled Canvas events.
- Engine-command-backed stitch placement, drag interpolation, recoloring, erasing, stable identifiers, and bounded immutable undo/redo history.
- Exclusive revisioned document rotation commands for clockwise/counterclockwise 90° and 180°, with technique-owned geometry transformation and explicit rejection of unsupported techniques.
- Blank-pattern creation with validated dimensions, editable pattern name, stitch/color summaries, canonical JSON download, and validated JSON import with explicit warnings/errors.
- Revisioned `color.set-symbol` engine commands for portable logical-color chart symbols; existing version 1 documents already carried this field, so no document-version migration was required.
- Color, symbol-only, and color-plus-symbol stitch views; zoom-proportional adjustable visual thread thickness; optional color-matched occupied-cell tint with adjustable intensity.
- Multi-color selection with Show All/Isolate Selected behavior and configurable dim opacity. Isolation is non-destructive and does not change the pattern document.
- Versioned local editor appearance preferences for renderer-only settings. Isolation selection remains transient; chart symbols remain portable pattern data.
- A curated set of 32 unique traditional geometric, circle, diamond, triangle, dot, line, directional, and star symbols. Curated symbols use font-independent normalized vector paths in Canvas; custom portable symbols retain the text fallback and existing editor command/JSON behavior.
- Local PNG, JPEG, and WebP image selection plus drag-and-drop, with signature/dimension validation, explicit size limits, bounded browser decoding, and no server upload.
- A conversion dialog with bounded source/pattern previews, editable fabric-cell dimensions, aspect-ratio lock, 2–32 color limit, optional dithering, stitch estimate, resulting palette, cancellation, and explicit unsaved-pattern replacement confirmation.
- Dependency-free deterministic median-cut color quantization and optional Floyd–Steinberg error diffusion in a Web Worker. Debounced request identifiers prevent stale results from replacing newer previews.
- Native version 1 full-cross pattern generation with row/column-derived stable stitch IDs, unique curated default chart symbols, validated integer coordinates, editable history integration, automatic fit, and canonical JSON compatibility.
- Transparent source regions remain empty fabric when an output cell is fully transparent; partial alpha is composited onto white before quantization. The policy is recorded in the generated document extension.
- Provider-neutral thread-catalog and color-matcher TypeScript ports with required source, licensing, redistribution, catalog-version, product-ID, algorithm-version, and color-provenance fields. No verified manufacturer catalog data is bundled.
- UI-independent `packages/thread-catalog` implementation with catalog validation, deterministic code/name search and pagination, stable lookup, unresolved-assignment resolution, sRGB-to-D50-Lab conversion, and CIEDE2000 ranking with deterministic ties.
- Revisioned `color.set-thread-product` and `color.replace` engine commands. The editor atomically remaps a logical color and assigns the chosen product while preserving color ID, chart symbol, stitches, layers, and geometry; existing snapshot history supplies undo/redo.
- Searchable synthetic thread browser with catalog identity, codes, names, swatches, nearest-match ordering and ΔE00 display, assign/remove/replace actions, and explicit unresolved-product warnings. The 12 entries are invented Cocolla development fixtures and are not labeled as DMC or manufacturer products.
- Pattern Document v1 JSON persistence for provider-qualified `threadProductId` values, including exact round trips when the referenced provider/product is unavailable. No schema migration was needed.

### App Hub static export pilot (branch `feat/apphub-export`, not merged; [ADR 0009](../decisions/0009-app-hub-static-export.md))

Verified 2026-11-22 on Node v24.14.0, Windows x64:

- **Pre-existing production defect fixed.** Every production build had inlined the raw TypeScript image-conversion worker as a `data:video/mp2t` URL, so image import never completed outside `npm run dev`. The worker is now created as `new Worker(new URL(...))` (one expression, `worker.format: "es"`) and is emitted as a 4.5 kB chunk.
  - A browser check against the unfixed code, built as a package and served through the App Hub gate, timed out at image conversion. The fixed build converts.
- **Configurable build:** `COCOLLA_BASE` / `COCOLLA_SOURCEMAP` / `COCOLLA_OUT_DIR`, with the previous defaults. `npm run package:apphub` writes `dist/apphub/cocolla/`:
  - `index.html`, `assets/` (JS, CSS, worker), `app.json`, `icon.svg`;
  - 6 files, about 321 KiB; no source maps, TypeScript or dev files.
- **`npm run check`: passed.**
  - Typecheck OK.
  - 79/79 existing tests.
  - 4/4 new `test:export` regression tests (real builds: default build unchanged, App Hub build under `/apps/projects/cocolla/`, invalid options rejected, verifier mutation check).
  - Benchmarks OK.
  - Default production build: 302.22 kB JS (93.75 kB gzip) + 20.97 kB CSS + 4.50 kB worker, plus source maps as before.
- **Served through the App Hub's real PHP gate** (`apphub-package-check.mjs`, App Hub repo, PHP 8.1.34 and 8.3.37), protected folder, Passcode:
  - App Hub audit and `app.json` valid;
  - locked page → unlock redirect, locked asset 403, icon public;
  - after unlock, all 6 files byte-identical with correct MIME types; worker URL resolves; SPA deep link serves the entry page; missing file 404.
- **Headless Chrome functional check** (`scripts/apphub-browser-check.mjs`) passed against:
  - (a) the package behind that gate, with the unlock cookie;
  - (b) the default production build via `vite preview`;
  - (c) the dev server.
- **That browser check covers:**
  - the editor loads;
  - drawing places stitches;
  - Export JSON yields a valid document and Import JSON restores it after a new blank pattern;
  - Import image converts through the Web Worker (a 24×16 PNG gave a 4,240-stitch pattern);
  - reload and an SPA deep link work;
  - no failed requests, console errors, or requests outside the base path (no server or database).
- **Hostinger staging (2026-11-22 13:40–13:43 EST):** the owner uploaded the package to the App Hub's protected `apphub-staging-apps/cocolla/` and set it to Passcode.
  - The App Hub lists it as `cocolla:passcode:0.0.0-a63154e`.
  - Locked paths redirect to the unlock page, and the icon is public.
  - The App Hub's full staging e2e passed 113/113 with Cocolla present (discovered in the protected folder, valid).
- **Real-host browser check (2026-11-22 13:55–14:01 EST, owner's tester passcode):**
  - unlock 200 with a `Secure; HttpOnly` app cookie; `index.html` served.
  - **FAIL: the editor did not start.** `assets/index-CRc9d9De.js`, `assets/index-CbvfTLp1.css` and the worker returned 404, because the upload had flattened `assets/` into the package root on the server.
  - Not a Cocolla defect: the files are complete there, and the App Hub's `apphub-upload-verify.mjs` confirms it.
  - Fix (owner): move the three files into `apphub-staging-apps/cocolla/assets/`, then re-run the check.
- `apphub-browser-check.mjs` now reports on any timeout what the browser shows (URL, title, text), plus failed requests, console errors and requests outside the base. That is how this was diagnosed.
- **Not verified yet:** the editor functions on Hostinger (LiteSpeed/CDN), pending the corrected upload.

### Verification

`npm run check` passed for COC.4.3 Stage 1 on 2026-10-18 using Node v24.14.0 on Windows x64:

- Strict engine and web typechecks: passed.
- Automated tests: 79 passed, 0 failed. New coverage includes all 34 published Sharma CIEDE2000 reference pairs, deterministic matching/ties, catalog validation/search/filter/pagination, assignment resolution, stale assignment and nearest-result suppression, provider failure, unknown-ID JSON preservation, revision conflicts, invalid/atomic commands, immutable logical-color replacement, symbols, undo/redo, and export/import.
- Existing 100,000-cell conversion, document-generation, and render-plan regressions completed in 53.6 ms, 152.2 ms, and 73.7 ms respectively during the final integration run.
- The standalone engine benchmark completed at 10,000 stitches (1,918,294 serialized bytes; 38.5 ms serialize; 24.7 ms deserialize) and 100,000 stitches (19,330,231 bytes; 345.6 ms serialize; 208.0 ms deserialize). These are single-run development-machine observations, not service-level guarantees.
- Production build passed. The generated web bundle was 304.17 kB JavaScript (94.96 kB gzip) and 20.97 kB CSS (4.96 kB gzip), excluding the source map.
- Headless Microsoft Edge QA at 1440×1000 verified all 12 synthetic entries, code/name filtering, nearest-match ordering, assignment, atomic logical-color replacement, undo/redo, retained chart symbol and active logical-color identity, and zero captured browser errors. The final catalog/editor state was visually inspected.

The matcher currently scans and converts the provider's products for each request. This is appropriate for the 12-entry synthetic fixture but has not been profiled against a verified full catalog; immutable per-version Lab caching is recommended before such a provider ships.

### Prior milestone verification

`npm run check` passed for COC.4.2 on 2026-10-18 using Node v24.14.0 on Windows x64:

- Strict typecheck: passed.
- Automated tests: 66 passed, 0 failed. New coverage includes dimension/aspect mapping, deterministic quantization, palette limits, dithering, transparency, PNG/JPEG/WebP headers, invalid/oversized inputs, stable stitches/symbols, serialization, stale-result cancellation, replacement preservation, post-import editing/rotation, bounded 100,000-cell conversion/document generation, wheel normalization/anchoring/bounds, and curated-symbol uniqueness/vector definitions.
- The 100,000-cell conversion regression completed in 65.2 ms, native-document generation and validation completed in 170.6 ms, and the 100,000-stitch viewport-culling render plan completed in 55.4 ms during the final test run.
- Production web build: 291.80 kB JavaScript (90.61 kB gzip) and 18.97 kB CSS (4.63 kB gzip), excluding the generated source map.
- Headless Microsoft Edge QA at 1440×900 decoded actual locally generated PNG, JPEG, and WebP files. It verified invalid-file handling, the mounted drag-and-drop path, cancellation without replacement, 80×45 and debounced 120×68 previews, eight-color dithering, explicit replacement confirmation, a native 7,719-stitch result, rotation/undo, and zero captured browser errors. A follow-up probe verified that three rapid Canvas wheel events were canceled while an outside wheel event was not, cumulative pointer-anchored zoom changed from 0.431 to 0.885 with less than 0.02 cell drift, all 32 picker entries appeared, assigned symbols were disabled for other colors, vector symbol-only rendering worked, and no browser errors occurred. The conversion, resulting-pattern, and symbol-picker states were visually inspected.
- The retained engine 10,000/100,000-stitch benchmark also passes through `npm run check`.

Measurements are single-run development-machine observations, not service-level guarantees. Conversion work is off the UI thread, but native document construction/validation on Apply and subsequent Canvas planning still run on the main thread. Render planning scans the full stitch collection. Tests do not measure peak memory, color-profile fidelity, sustained frame rate, mobile devices, or Synology behavior.

Immediately before PR #4 was merged, `npm run check` again passed with 66 tests and `npm run build` passed. That run observed 49.8 ms for the 100,000-cell conversion regression, 159.2 ms for native document generation/validation, and 42.9 ms for the 100,000-stitch render-plan regression. GitHub had no configured Actions workflow or commit status checks for the PR, so local validation is the recorded merge evidence.

For the PR #5 correction, `npm run check` passed with 67 tests and `npm run build` passed. Its single added regression proves that alpha value 1 remains a visible stitch while alpha 0 remains empty. That run observed 94.4 ms for 100,000-cell conversion, 321.5 ms for 100,000-cell document generation/validation, and 51.9 ms for the 100,000-stitch render-plan regression; the standalone engine benchmark also completed at both 10,000 and 100,000 stitches.

### Not implemented

Fastify API, authentication, PostgreSQL persistence/RLS, server or browser draft persistence, server worker jobs, printable or machine exports, progress tracking, deployment, and AI adapters are not implemented on this branch. Image import creates full-cross patterns only and does not preserve the source image in the portable document. A verified DMC provider remains deferred until an exact catalog artifact, license/permission, attribution, trademark treatment, product-line scope, version, provenance, and update policy are approved; no official color data is claimed or included. Bulk palette remapping/merging, catalog-constrained image quantization, assignment snapshots beyond the stable ID, aliases/discontinued-product metadata, and catalog-version drift reports are also not implemented.
