# Cocolla Invariants

Rules that must hold. Change them only deliberately through an explicit architecture decision.

1. The pattern document is independent of React, Canvas, Fastify, PostgreSQL, filesystem layout, and AI providers.
2. The stitch engine is deterministic where inputs are equal and does not perform network, database, filesystem, or UI work.
3. Saved geometry uses safe integer document units, never pixels. Grid alignment is a technique rule, not a coordinate-system restriction.
4. Logical stitch geometry is canonical. Physical stitching routes and back-of-fabric views are separate, revision-bound derived estimates.
5. Technique keys and payload versions are explicit. Unsupported technique payloads are preserved on round trip and never silently interpreted or discarded.
6. Document versions migrate only through explicit ordered migrations. Unsupported future versions and invalid current documents fail explicitly.
7. Stitch identifiers are stable across geometry and color edits. Commands never silently replace a stitch identity.
8. AI integration is optional, isolated, disabled by default, and cannot be required for core document behavior.
9. Multi-user project data is private by default. Future persistence work must enforce ownership at application and database boundaries.
10. Local Windows development and isolated Linux-container staging/production on the Synology target remain supported.
11. Planned functionality must not be described as implemented without verification evidence in `current-state.md`.
