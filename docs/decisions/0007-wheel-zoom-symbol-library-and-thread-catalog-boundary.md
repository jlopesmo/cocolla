# ADR 0007 — Wheel zoom, chart-symbol library, and thread-catalog boundary

**Status:** Accepted

**Date:** 2026-10-18

**Decision scope:** COC.4.2 follow-up

## Context

Canvas navigation should use ordinary mouse-wheel input, pattern colors need a broader traditional chart-symbol vocabulary, and future physical-floss mapping must not bind Cocolla to an unverified proprietary catalog. The portable version 1 document already stores a unique symbol and an optional thread-product identifier for each logical color.

## Decision

- Treat a wheel event over the interactive Canvas as pointer-anchored zoom without requiring Ctrl or Command. Normalize pixel, line, and page delta modes; keep the existing 0.01–8 zoom bounds; and call `preventDefault` only in the Canvas wheel handler. Drag panning and explicit zoom controls remain unchanged.
- Provide 32 curated geometric, directional, dot, line, circle, and star symbols. Store their existing Unicode/ASCII values in `PatternColorV1.symbol`, so revisioned commands, validation, migrations, and canonical JSON remain unchanged.
- Preserve manual symbol entry. The engine continues to reject empty, overlong, or duplicate active-color symbols atomically. The picker disables symbols assigned to another active color.
- Describe curated symbols with renderer-independent normalized vector primitives. Canvas renders those paths without depending on installed glyph fonts; custom symbols use the existing text fallback. Image conversion assigns its first 32 palette colors from the same curated collection.
- Define a catalog-independent `ThreadCatalogProvider` and `ThreadColorMatcher` port in `packages/contracts`. Catalog descriptors require source, publisher, retrieval, license, and redistribution metadata. Products use provider-qualified stable identifiers and explicit color provenance.
- Do not bundle DMC names, numbers, or color values in this milestone. No verified source and redistribution decision is recorded, so inventing or copying a catalog would violate project governance. `PatternColorV1.threadProductId` remains the portable mapping hook.

## Deferred DMC milestone

A separately authorized catalog milestone must verify the exact source and distribution rights, record the reference decision, implement browsing/search, choose and version a color-distance method, show approximate-match confidence, allow user overrides, and test catalog/version drift. Image conversion will then offer optional matches after quantization; logical RGB colors must remain valid when no catalog is installed.

## Consequences

- Wheel scrolling over the Canvas zooms rather than scrolling the page; scrolling elsewhere is unaffected.
- Curated chart output is stable across fonts in the Canvas, while user-defined symbols retain broad JSON compatibility.
- The thread interface can be backed by local, server, licensed, or user-supplied catalogs without putting a vendor dependency in the stitch engine.
- No dependency or external-reference decision changed, so `repoinspire.md` is unchanged.

## Verification evidence

- Pure tests cover wheel-delta normalization, zoom anchoring/bounds, symbol uniqueness/vector definitions, active-color availability, image-import assignment, engine duplicate rejection, and JSON round trips.
- Browser validation and exact command results are recorded in `docs/icm/current-state.md`.
