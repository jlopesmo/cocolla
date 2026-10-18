# Cocolla Current State

**As of:** 2026-10-18

## Detected facts

- Project ID: `cocolla`
- Created as a framework-neutral blank project by nexOS Project Creator.
- Milestone 1 was squash-merged to `main` through GitHub PR #1 at commit `8a679bccdae8e116af37aca23466da6f28db47d7`.
- COC.2 implementation branch: `feat/coc2-visual-pattern-editor`.
- COC.4.1 implementation branch: `feat/coc4-stitch-appearance` (pending review; not merged).
- Architecture approved on 2026-10-18.

## Status

COC.1, COC.2, and the COC.2.1 fit/rotation refinements are implemented. COC.4.1 stitch appearance, symbols, and color isolation are implemented and verified on `feat/coc4-stitch-appearance`, pending review and merge.

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

### Verification

`npm run check` passed for COC.4.1 on 2026-10-18 using Node v24.14.0 on Windows x64:

- Strict typecheck: passed.
- Automated tests: 52 passed, 0 failed. Coverage includes appearance preference normalization/serialization, display-mode layers, zoom-proportional thread width, tint/isolation opacity, immutable multi-color selection, symbol command validation/atomicity/history, and symbol JSON round trips.
- 100,000-stitch viewport-culling render plan: 59.0 ms in the regression test; fewer than 2,000 stitches entered the visible render plan.
- Production web build: 269.42 kB JavaScript (83.57 kB gzip) and 13.97 kB CSS (3.67 kB gzip), excluding the generated source map.
- Headless Microsoft Edge QA at 1440×900: initial fitted layout was visually inspected. An interactive browser probe changed to color-plus-symbol mode, set thread thickness to 30%, changed the active symbol to `Z`, placed a stitch, isolated the selected color, observed one stitch and document revision 2, verified versioned local appearance storage, and reported no browser errors.
- The retained engine 10,000/100,000-stitch benchmark also passes through `npm run check`.

Measurements are single-run development-machine observations, not service-level guarantees. Render planning and tint/symbol drawing operate only on the culled visible plan, but render planning still scans the full stitch collection. The tests do not measure sustained frame rate or peak memory, and no database, network, mobile-device, route-optimization, or Synology behavior is included.

### Not implemented

Fastify API, authentication, PostgreSQL persistence/RLS, server or browser draft persistence, worker jobs, image/external-format imports, printable or machine exports, progress tracking, deployment, and AI adapters are not implemented on this branch. COC.2 import/export remains limited to versioned Cocolla JSON files. COC.4.2 image import has not begun.
