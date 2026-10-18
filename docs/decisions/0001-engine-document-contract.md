# ADR 0001 — Engine and pattern document contract

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.1 Milestone 1

## Context

Cocolla must begin with cross-stitch but support later non-grid embroidery techniques. The document must remain independent of UI rendering and database persistence. Logical stitch geometry must not be confused with a physical stitching route or a back-of-fabric estimate.

## Decision

- Implement `packages/contracts` and `packages/engine` as strict TypeScript modules built by one minimal root npm/TypeScript toolchain.
- Use pattern format identifier `cocolla.pattern` and current document version 1. Maintain matching TypeScript types, JSON Schema, runtime validation, canonical serialization, and explicit ordered migrations.
- Use safe integer design units. Default to 1024 units per fabric cell, but treat grid alignment as a technique constraint. Future freeform techniques may use arbitrary integer anchors and versioned point/curve data.
- Represent every stitch with a stable caller-supplied identifier, technique key/version, layer, logical color, anchor, versioned JSON payload, and element revision.
- Preserve unsupported technique payloads during round trips. Reject operations that require unsupported interpretation.
- Implement edits as immutable deterministic commands. A non-empty command batch validates a base revision, applies atomically, and advances the document revision once.
- Keep front geometry as technique-derived engine primitives. Keep physical route choices and heuristic back estimates outside the pattern document and bind them to a document revision.
- Implement full-cross version 1, two front diagonal primitives, four possible route orientations, and a deterministic row-major naive route. Do not claim physical accuracy.
- Use TypeScript 5.9.3, Node 24 LTS, npm, Node's built-in test runner, and `@types/node` 24.10.9. There are no engine runtime dependencies.
- Use a single root compilation rather than npm workspace links because the current Windows external volume rejects the required directory symlinks. Physical package boundaries and dependency direction remain explicit.

## Consequences

- UI and persistence layers can consume the same stable document and command contract without becoming engine dependencies.
- A new technique normally adds a registered behavior module and payload version, not a canvas or document rewrite.
- Integer resolution is finite; a future need for more precision requires a document migration or a technique-specific representation.
- Canonical JSON is easy to inspect and test but is large at 100,000 stitches. Compression, chunks, or binary transport remain future benchmark-gated decisions.
- Route and back estimates can be regenerated or replaced without migrating canonical logical stitches.

## Verification evidence

- `npm run check` passes strict typechecking, 24 automated tests, and 10,000/100,000-stitch benchmarks.
- Detailed verified status and benchmark limitations are recorded in `docs/icm/current-state.md`.
