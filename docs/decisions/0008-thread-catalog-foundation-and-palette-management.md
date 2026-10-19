# ADR 0008 — Thread catalog foundation and palette management

**Status:** Accepted
**Date:** 2026-10-18
**Decision scope:** COC.4.3 Stage 1

## Context

Cocolla needs optional mappings from portable logical pattern colors to physical thread products. Catalog data may be missing, replaced, or legally unavailable, so the engine cannot depend on an installed provider. Users also need an explicit way to replace a logical color with a selected product approximation without rewriting stitch references or chart symbols. No verified DMC dataset has been approved for redistribution.

## Decision

- Keep `ThreadCatalogProvider`, product, descriptor, attribution, and matcher interfaces in `packages/contracts` and implement their catalog-independent behavior in a new UI-independent `packages/thread-catalog` package.
- Keep the engine independent of providers. It stores only the stable provider-qualified `threadProductId` already present in Pattern Document v1.
- Add immutable revisioned engine commands `color.set-thread-product` and `color.replace`. Replacement changes the selected logical color's display name and sRGB value while preserving its stable ID, chart symbol, physical assignment unless explicitly changed, stitch references, layers, and geometry. The editor atomically batches replacement with assignment to the selected product.
- Treat an unavailable product ID as unresolved portable data. Export/import preserves it exactly; the UI warns and offers explicit removal or replacement but never clears it automatically.
- Implement deterministic matching as dependency-free sRGB → XYZ D65 → Bradford-adapted XYZ D50 → CIE Lab followed by CIEDE2000. Equal distances sort by normalized manufacturer code and then product ID. Identify the algorithm as `ciede2000-srgb-d50` version 1.
- Validate CIEDE2000 against all 34 Sharma–Wu–Dalal supplemental reference pairs. Use the W3C CSS Color 4 conversion model for color-space conversion.
- Ship only a small Cocolla synthetic validation catalog in this stage. Its identity and UI copy explicitly state that it is invented development data and not an official DMC or other manufacturer catalog.
- Do not add a catalog dependency, DMC data, backend, database, or network lookup. A verified catalog remains an optional provider behind the same ports.

## Consequences

- Pattern Document v1 needs no migration: thread mappings already have a nullable stable identifier field, and logical-color replacement changes existing fields through validated commands.
- Assignment and remapping participate in existing revision checks, atomic batches, canonical JSON, and snapshot undo/redo.
- Chart symbols, color isolation, stitching geometry, and image conversion remain keyed to logical color IDs and therefore survive remapping.
- Matching currently scans the provider and converts product colors per request. This is bounded for the synthetic catalog; a verified full catalog should precompute Lab values by immutable catalog version after profiling.
- Approximate screen RGB values and ΔE00 rankings do not represent measured thread appearance. The user remains authoritative, and a future provider must expose provenance, version, licensing, and redistribution metadata.
- DMC integration remains blocked on approval of an exact source artifact and its redistribution, attribution, trademark, update, and provenance terms.

## References

- [COC.4.3 architecture and source proposal](../architecture/coc4-thread-catalog-plan.md)
- [ADR 0007 — Wheel zoom, chart-symbol library, and thread-catalog boundary](0007-wheel-zoom-symbol-library-and-thread-catalog-boundary.md)
- [W3C CSS Color Module Level 4](https://www.w3.org/TR/css-color/)
- [Sharma, Wu, and Dalal CIEDE2000 test data](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt)
