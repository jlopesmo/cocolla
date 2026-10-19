# Cocolla architecture

The application architecture was approved as Cocolla's initial technical direction on 2026-10-18. Implementation claims remain limited to evidence recorded in ICM current state.

- [Application architecture proposal](application-architecture.md)
- [Implementation plan](implementation-plan.md)
- [ADR 0002 — Visual pattern editor](../decisions/0002-visual-pattern-editor.md)
- [ADR 0003 — Document rotation and viewport fit](../decisions/0003-document-rotation-and-viewport-fit.md)
- [ADR 0005 — Stitch appearance, symbols, and color isolation](../decisions/0005-stitch-appearance-symbols-and-color-isolation.md)
- [ADR 0006 — Local image-to-pattern conversion](../decisions/0006-local-image-to-pattern-conversion.md)
- [ADR 0007 — Wheel zoom, chart-symbol library, and thread-catalog boundary](../decisions/0007-wheel-zoom-symbol-library-and-thread-catalog-boundary.md)
- [ADR 0008 — Thread catalog foundation and palette management](../decisions/0008-thread-catalog-foundation-and-palette-management.md)
- [COC.3 private-persistence breakdown](coc3-private-persistence-plan.md)
- [COC.4.3 thread-catalog and color-matching proposal](coc4-thread-catalog-plan.md)

The proposal was prepared for COC.1 on 2026-10-18. COC.1 implemented the document contract and UI-independent engine; COC.2 implemented the local visual editor; COC.4.1 extended renderer preferences and portable color symbols; COC.4.2 added local image conversion, direct wheel zoom, a vector-backed symbol library, and catalog-neutral thread contracts. COC.4.3 Stage 1 implements the provider-independent catalog/matcher package, revisioned mappings and color replacement, and a synthetic-catalog editor workflow. No DMC or other third-party thread data is bundled. Backend, database, authentication, and deployment configuration do not exist on this branch.
