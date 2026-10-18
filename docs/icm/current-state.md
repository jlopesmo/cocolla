# Cocolla Current State

**As of:** 2026-10-18

## Detected facts

- Project ID: `cocolla`
- Created as a framework-neutral blank project by nexOS Project Creator.
- Milestone 1 was squash-merged to `main` through GitHub PR #1 at commit `8a679bccdae8e116af37aca23466da6f28db47d7`.
- COC.2 implementation branch: `feat/coc2-visual-pattern-editor`.
- COC.4.1 was squash-merged through GitHub PR #3 at commit `d0a4c594ad66444f046f1be341d24eb51f595a14`.
- COC.4.2 was squash-merged through GitHub PR #4 at commit `2c35dd107dae67bd7c707d0b61eb98aacc6c7e1c`.
- Post-merge review found that alpha values 1–15 were incorrectly treated as fully transparent. The two-file correction is validated on `fix/coc4-image-alpha-policy` in PR #5 but is not yet merged.
- Architecture approved on 2026-10-18.

## Status

COC.1, COC.2/COC.2.1, COC.4.1, and the main COC.4.2 change are merged. COC.4.2 has one validated corrective PR pending: PR #5 makes every nonzero-alpha image cell visible as required by ADR 0006. COC.4.3 thread-catalog architecture and source research is proposed in `docs/architecture/coc4-thread-catalog-plan.md`; no catalog data, matcher, dependency, or thread-mapping UI has been implemented.

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
- Provider-neutral thread-catalog and color-matcher TypeScript ports with required source, licensing, redistribution, catalog-version, product-ID, algorithm-version, and color-provenance fields. No physical catalog data is bundled.

### Verification

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

Fastify API, authentication, PostgreSQL persistence/RLS, server or browser draft persistence, server worker jobs, printable or machine exports, progress tracking, deployment, and AI adapters are not implemented on this branch. Image import creates full-cross patterns only and does not preserve the source image in the portable document. DMC browsing and matching are intentionally deferred until an exact catalog source, license, attribution, redistribution policy, and matching algorithm are approved; no official color data is claimed or included.
