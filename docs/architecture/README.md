# Cocolla architecture

The application architecture was approved as Cocolla's initial technical direction on 2026-10-18. Implementation claims remain limited to evidence recorded in ICM current state.

- [Application architecture proposal](application-architecture.md)
- [Implementation plan](implementation-plan.md)
- [ADR 0002 — Visual pattern editor](../decisions/0002-visual-pattern-editor.md)
- [ADR 0003 — Document rotation and viewport fit](../decisions/0003-document-rotation-and-viewport-fit.md)
- [ADR 0005 — Stitch appearance, symbols, and color isolation](../decisions/0005-stitch-appearance-symbols-and-color-isolation.md)
- [ADR 0006 — Local image-to-pattern conversion](../decisions/0006-local-image-to-pattern-conversion.md)
- [COC.3 private-persistence breakdown](coc3-private-persistence-plan.md)

The proposal was prepared for COC.1 on 2026-10-18. COC.1 implemented the document contract and UI-independent engine; COC.2 implemented the local visual editor; COC.4.1 extended renderer preferences and portable color symbols; COC.4.2 adds local image conversion without backend or runtime dependencies. Backend, database, authentication, and deployment configuration do not exist on this branch.
