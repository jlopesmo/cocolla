# Cocolla Context

## Purpose

Cocolla is intended to be a multi-user embroidery and cross-stitch design application for creating, importing, editing, visualizing, and managing private stitching projects. Planned product capabilities include an interactive stitch canvas, image-to-pattern conversion, thread color management, front and estimated-back fabric visualization, pattern exporting, and stitch progress tracking. The architecture supports self-hosted deployment and optional future AI assistance without making AI part of the core.

## Detected facts

- Project ID: `cocolla`
- Created as a framework-neutral blank project by nexOS Project Creator.
- Initial architecture approved on 2026-10-18.
- Milestone 1 implements a strict-TypeScript, UI-independent stitch engine and pattern document contract.

## Major parts

- `packages/contracts` — persistence- and UI-independent versioned pattern document types and JSON Schema.
- `packages/engine` — document validation, migrations, commands, stitch techniques, front geometry, and route/back-estimation interfaces.
- `apps/web` — implemented React/Vite application shell, layered Canvas 2D editor, viewport/interaction core, local history, and JSON import/export.
- `apps/api` — planned Fastify application boundary; not implemented.
- `packages/db` — planned PostgreSQL persistence; not implemented.
- `apps/worker` — planned bounded import/export/routing jobs; not implemented.
- Optional AI adapters — planned extension boundary only; disabled and not implemented.

## Sources of truth

- [Application architecture](../architecture/application-architecture.md)
- [Implementation plan](../architecture/implementation-plan.md)
- [Engine document contract decision](../decisions/0001-engine-document-contract.md)
- [Current verified state](current-state.md)
- [Project invariants](invariants.md)
- [Repository-reference register](../../repoinspire.md)
