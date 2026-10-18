# Cocolla stitch engine

The Cocolla stitch engine is a deterministic TypeScript library with no UI, HTTP, database, filesystem, or AI dependency. It owns the versioned pattern document contract, technique behavior, commands, geometry, migration, and route-estimation interfaces. The version 1 JSON Schema is in `packages/contracts/schema/pattern-document-v1.schema.json`; the matching TypeScript contract is in `packages/contracts/src/pattern-document.ts`.

## Coordinate model

All saved coordinates are safe integers in document design units. Version 1 defaults to 1024 design units per fabric cell. A full cross anchors to a fabric-cell boundary and occupies one cell.

The coordinate space itself is not a grid. A future technique may store arbitrary integer anchors and additional points or control data in its versioned `geometry.data` payload. Its technique module validates the payload and converts it to engine geometry and route options. This allows freeform embroidery geometry without changing coordinates to pixels or embedding renderer objects in the document.

## Separation of concerns

- `PatternDocumentV1` stores logical elements, layers, colors, bounds, and technique payloads.
- Technique modules turn logical elements into front-of-fabric primitives.
- `StitchingRoute` is a separate, revision-bound choice and ordering of physical route options.
- `BackFabricEstimate` is derived from a route and is always labeled heuristic.
- Serialization has no knowledge of React, Canvas, Fastify, or PostgreSQL.

Unsupported technique payloads are preserved during valid document round trips, but operations that must interpret them fail with `UnsupportedTechniqueError`. Future document versions fail with `UnsupportedDocumentVersionError`; older versions require an explicit ordered migration.

## Current limitations

- Only full-cross technique version 1 is interpreted.
- The naive route is a deterministic row-major estimate, not a physically optimized or authoritative stitching path.
- Thread estimates are geometric design-unit lengths and do not account for fabric thickness, tension, tails, knots, or waste.
- Version 0 exists only as a migration test fixture and was never a released Cocolla format.
