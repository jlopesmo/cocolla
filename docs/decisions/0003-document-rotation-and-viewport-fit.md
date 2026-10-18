# ADR 0003 — Document rotation and viewport fit

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.2.1

## Context

The COC.2 editor initially fitted against a placeholder canvas size and then suppressed the fit calculated from the real workspace. It also had no document-level rotation operation. Canvas-only rotation would leave persisted geometry, exports, routes, progress references, and future renderers inconsistent.

## Decision

- Model the editor viewport as `fit` or `manual`. Fit mode derives its viewport from the measured Canvas container and responds to container/window/sidebar resizing. A user zoom or pan enters manual mode, which preserves the viewport across resize. New, import, rotation, and the explicit Fit control request fit mode.
- Support zoom down to 1% so the full approved 2,000-cell dimension can fit typical workspaces. Fit uses balanced padding and centers both axes.
- Add `document.rotate` to the engine command model for clockwise 90°, counterclockwise 90°, and 180° rotations. It is an exclusive, revision-checked, immutable command and increments the document revision once.
- Delegate geometry and orientation changes to a versioned technique `rotateGeometry` hook. Full-cross version 1 rotates its one-cell extent deterministically and increments each transformed element revision.
- Preserve document identity, metadata, colors, layers, stitch identifiers, and technique payloads that the technique returns unchanged. Quarter turns swap bounds; a half turn retains them.
- Reject unknown techniques and techniques without rotation support explicitly. Never guess how an opaque technique payload encodes orientation.

## Consequences

- Rotation changes the pattern document rather than the renderer and therefore serializes, imports, exports, and participates in local undo/redo normally.
- A future non-grid technique must implement its own rotation semantics before documents containing it can rotate.
- Derived routes and back estimates remain separate from geometry and are revision-bound; future persisted derivatives become stale when the document revision changes.
- Automatic resize fitting is intentionally disabled after manual navigation until the user performs an action that explicitly requests a fit.

## Verification evidence

- Engine tests cover all three rotations, rectangular bounds, four-quarter-turn equivalence, canonical serialization, exclusivity, invalid rotation values, and atomic unsupported-technique failure.
- Editor tests cover fit centering, wide/tall aspect ratios, container resizing, manual viewport preservation, and rotation undo/redo.
- Browser validation and final command results are recorded in `docs/icm/current-state.md`.
