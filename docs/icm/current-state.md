# Cocolla Current State

**As of:** 2026-10-18

## Detected facts

- Project ID: `cocolla`
- Created as a framework-neutral blank project by nexOS Project Creator.
- Milestone 1 was squash-merged to `main` through GitHub PR #1 at commit `8a679bccdae8e116af37aca23466da6f28db47d7`.
- COC.2 implementation branch: `feat/coc2-visual-pattern-editor`.
- COC.4.1 was squash-merged through GitHub PR #3 at commit `d0a4c594ad66444f046f1be341d24eb51f595a14`.
- COC.4.2 implementation branch: `feat/coc4-image-import` (pending review; not merged).
- Architecture approved on 2026-10-18.

## Status

COC.1, COC.2/COC.2.1, and COC.4.1 are merged. COC.4.2 local image-to-pattern conversion is implemented and verified on `feat/coc4-image-import`, pending review and merge.

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
- Engine-command-backed stitch placement, drag interpolation, recoloring, erasing, stable identifiers, and bounded immutable undo/redo history.
- Exclusive revisioned document rotation commands for clockwise/counterclockwise 90° and 180°, with technique-owned geometry transformation and explicit rejection of unsupported techniques.
- Blank-pattern creation with validated dimensions, editable pattern name, stitch/color summaries, canonical JSON download, and validated JSON import with explicit warnings/errors.
- Revisioned `color.set-symbol` engine commands for portable logical-color chart symbols; existing version 1 documents already carried this field, so no document-version migration was required.
- Color, symbol-only, and color-plus-symbol stitch views; zoom-proportional adjustable visual thread thickness; optional color-matched occupied-cell tint with adjustable intensity.
- Multi-color selection with Show All/Isolate Selected behavior and configurable dim opacity. Isolation is non-destructive and does not change the pattern document.
- Versioned local editor appearance preferences for renderer-only settings. Isolation selection remains transient; chart symbols remain portable pattern data.
- Local PNG, JPEG, and WebP image selection plus drag-and-drop, with signature/dimension validation, explicit size limits, bounded browser decoding, and no server upload.
- A conversion dialog with bounded source/pattern previews, editable fabric-cell dimensions, aspect-ratio lock, 2–32 color limit, optional dithering, stitch estimate, resulting palette, cancellation, and explicit unsaved-pattern replacement confirmation.
- Dependency-free deterministic median-cut color quantization and optional Floyd–Steinberg error diffusion in a Web Worker. Debounced request identifiers prevent stale results from replacing newer previews.
- Native version 1 full-cross pattern generation with row/column-derived stable stitch IDs, unique default chart symbols, validated integer coordinates, editable history integration, automatic fit, and canonical JSON compatibility.
- Transparent source regions remain empty fabric when an output cell is fully transparent; partial alpha is composited onto white before quantization. The policy is recorded in the generated document extension.

### Verification

`npm run check` passed for COC.4.2 on 2026-10-18 using Node v24.14.0 on Windows x64:

- Strict typecheck: passed.
- Automated tests: 63 passed, 0 failed. New coverage includes dimension/aspect mapping, deterministic quantization, palette limits, dithering, transparency, PNG/JPEG/WebP headers, invalid/oversized inputs, stable stitches/symbols, serialization, stale-result cancellation, replacement preservation, post-import editing/rotation, and bounded 100,000-cell conversion and native-document generation.
- The 100,000-cell conversion regression completed in 49.2 ms, native-document generation and validation completed in 159.3 ms, and the 100,000-stitch viewport-culling render plan completed in 48.0 ms during the final test run.
- Production web build: 287.20 kB JavaScript (89.18 kB gzip) and 18.38 kB CSS (4.53 kB gzip), excluding the generated source map.
- Headless Microsoft Edge QA at 1440×900 decoded actual locally generated PNG, JPEG, and WebP files. It verified invalid-file handling, the mounted drag-and-drop path, cancellation without replacement, 80×45 and debounced 120×68 previews, eight-color dithering, explicit replacement confirmation, a native 7,719-stitch result, rotation/undo, and zero captured browser errors. The populated conversion dialog and fitted resulting pattern were visually inspected.
- The retained engine 10,000/100,000-stitch benchmark also passes through `npm run check`.

Measurements are single-run development-machine observations, not service-level guarantees. Conversion work is off the UI thread, but native document construction/validation on Apply and subsequent Canvas planning still run on the main thread. Render planning scans the full stitch collection. Tests do not measure peak memory, color-profile fidelity, sustained frame rate, mobile devices, or Synology behavior.

### Not implemented

Fastify API, authentication, PostgreSQL persistence/RLS, server or browser draft persistence, server worker jobs, printable or machine exports, progress tracking, deployment, and AI adapters are not implemented on this branch. Image import creates full-cross patterns only; it does not map colors to physical thread products or preserve the source image in the portable document.
