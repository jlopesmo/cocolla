# ADR 0002 — Visual pattern editor

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.2

## Context

COC.2 authorizes the first usable browser editor ahead of the previously proposed persistence milestone. The editor must consume the existing pattern document and stitch engine, remain local-only until persistence is implemented, and establish whether Canvas 2D is a practical initial renderer.

## Decision

- Use React 19.3.1 for the application shell and Vite 8.3.4 with `@vitejs/plugin-react` 6.1.2 for local development and production bundling.
- Keep coordinate mapping, drag interpolation, document operations, render planning, and history in pure TypeScript modules. React owns panels and application state; it does not create one component per stitch.
- Render engine-provided stitch primitives through two Canvas 2D layers: a design layer with backing-store density capped at 2× and a lightweight hover/selection interaction overlay. Pointer hover does not rebuild the full stitch layer.
- Cull geometry outside the visible viewport before adapting engine primitives to Canvas coordinates. Retain Canvas 2D unless representative profiling demonstrates a need for WebGL.
- Apply stitch placement, removal, and recoloring through engine command APIs. Use bounded immutable document snapshots for local undo/redo.
- Keep server persistence out of scope. Export canonical versioned JSON downloads and import through engine deserialization, migration, and validation with explicit errors and warnings.
- Preserve unsupported technique payloads on import/export and report that unsupported elements are not rendered.

## Consequences

- `npm run dev` starts a local editor at `http://127.0.0.1:5173/`; `npm run build` emits the static application to `dist/web`.
- Pattern changes are lost unless exported. The interface labels this limitation and does not claim cloud or database saving.
- Snapshot history is simple and revision-safe but consumes memory proportional to the edited document size; persistence and command-log compaction remain later work.
- Render planning still scans the stitch collection to find visible elements. Spatial indexing or tiles remain benchmark-gated improvements for substantially larger patterns.

## Verification evidence

- Strict TypeScript checks and all engine/editor tests pass through `npm run check`.
- A 100,000-stitch render-plan regression test verifies viewport culling under a broad ceiling.
- Headless Microsoft Edge browser QA exercises new-pattern creation, drag drawing, color selection, erasing, undo/redo, panning, and actual visual rendering without console errors.
- Exact measurements and limitations are recorded in `docs/icm/current-state.md`.
