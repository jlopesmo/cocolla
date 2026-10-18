# ADR 0005 — Stitch appearance, symbols, and color isolation

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.4.1

## Context

The local Canvas editor needs more expressive chart views without confusing visual choices with stitch geometry or physical thread specifications. Chart symbols must travel with a pattern, while canvas appearance and temporary color isolation should not create document revisions or change exported pattern meaning.

## Decision

- Keep the existing version 1 `PatternColorV1.symbol` as portable pattern data. Add a revision-checked, immutable `color.set-symbol` engine command so React never mutates document internals. Existing validation continues to require non-empty, unique symbols of at most eight characters; canonical JSON already preserves them, so the document version does not change.
- Treat thread thickness as a dimensionless Canvas display ratio, not thread-product strand data and not stitch geometry. Clamp it to 8–32% of the rendered fabric-cell size so visual proportions scale with zoom.
- Provide color, symbol-only, and color-plus-symbol display modes. These adapt the same engine-produced front geometry; they do not create alternate document geometry.
- Store renderer-only appearance preferences in versioned browser-local storage under `cocolla.editor.appearance.v1`: display mode, thread thickness, unselected-color opacity, tint enabled state, and tint intensity. Invalid or unavailable storage falls back to bounded defaults.
- Keep selected color IDs and whether isolation is active as transient editor state. Show All and Isolate Selected affect Canvas opacity only and never alter stitches, colors, revisions, exports, or history.
- Draw subtle color-matched tint only for occupied cells in the viewport-culled render plan, behind grid/thread/symbol layers. Apply the same isolation opacity to thread, symbol, and tint layers.
- Keep all preference normalization, display-layer selection, and opacity/width calculations in a pure UI-independent TypeScript module. The stitch engine remains independent of React and Canvas; only the portable symbol edit belongs in the engine command model.

## Consequences

- Symbol edits participate in undo/redo and canonical export/import; appearance and isolation changes do not mark a document dirty.
- Physical thread products remain free to define strands, diameter, or other specifications later without overloading the visual thickness control.
- Symbol-only mode uses high-contrast neutral symbols. At zoom levels too small for legible text, it uses a neutral marker rather than rendering misleading glyphs.
- Rendering work is bounded to the visible render plan, though obtaining that plan still scans every stitch. Spatial indexing remains benchmark-gated future work.
- Unknown technique payloads are not modified by appearance controls or symbol edits. Existing unsupported-technique preservation and non-rendering behavior remains unchanged.

## Verification evidence

- Engine/editor tests cover symbol immutability, invalid/duplicate/missing-color failures, history, JSON compatibility, preference persistence normalization, multi-color selection, display modes, zoom-proportional thickness, and isolation-aware tint opacity.
- `npm run check` and `npm run build` pass; exact counts, measurements, and limitations are recorded in `docs/icm/current-state.md`.
- Headless Edge visual and interaction validation exercised appearance controls, symbol editing, drawing, isolation, local preference persistence, and browser error capture.
