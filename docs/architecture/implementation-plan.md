# Cocolla concise implementation plan

**Status:** Approved; Milestone 1 completed on 2026-10-18; later milestones not authorized
**Prepared:** 2026-10-18

Each milestone must be demonstrable, independently testable, and leave the repository in a usable state. A milestone does not begin merely because it appears here.

## Milestone 0 — approve and record foundations (complete)

- Approve or amend the decisions in the architecture proposal.
- Write focused ADRs for the approved stack, document model/coordinates, persistence shape, tenancy/RLS, renderer, and deployment shape.
- Update the ICM context, invariants, current state, and roadmap to reflect decisions without claiming implementation.
- Select exact supported versions and the minimal build, test, schema-validation, SQL, and authentication tooling; update `repoinspire.md` decisions before installation.

**Exit:** Decisions are explicit, reference status is accurate, and no unresolved choice blocks the first scaffold.

## Milestone 1 — engine kernel and document contract (complete)

Implemented and verified on `feat/coc1-engine-kernel`.

- Create only the workspace needed for `packages/engine`, `packages/contracts`, and tests.
- Implement integer coordinates, pattern metadata, logical colors, layers, stable stitch IDs, and one full-cross technique.
- Implement deterministic add, remove, move, and recolor commands with validation and revision checks.
- Implement versioned serialization and migration fixtures; prove unknown technique data is preserved.
- Derive front geometry and basic thread-length estimates without UI, database, or network imports.
- Add unit/property tests and serialization round-trip tests, plus a small 10k/100k synthetic benchmark harness.

**Exit:** A blank pattern can be created, edited through commands, validated, serialized, restored identically, and benchmarked entirely in the pure engine. Dependency-boundary tests prove the engine imports no application infrastructure.

## Milestone 2 — private persistence vertical slice (recommended next; not started)

- Add the Fastify API and PostgreSQL migrations for users, sessions, projects, patterns, layers, colors, stitch elements, and change sets.
- Add local authentication, secure sessions, owner-scoped repositories, forced RLS, and separate migration/application roles.
- Implement create/list/read/update for a private project and blank pattern through validated command batches.
- Add cross-user denial tests, migration tests, optimistic-conflict tests, and backup/restore smoke documentation.

**Exit:** Two test users cannot observe or mutate each other's resources through any supported path, and a pattern round-trips through PostgreSQL.

## Milestone 3 — blank canvas editor

- Add the React SPA shell and accessible editor controls.
- Implement layered Canvas 2D rendering, pan, zoom, resize, selection, pencil/erase/recolor, local undo/redo, and debounced command-batch saves.
- Add viewport culling, tile invalidation, symbols as well as colors, keyboard operation, and end-to-end tests.
- Run the representative 10k/100k/500k rendering and payload benchmarks; decide whether normalized storage and Canvas 2D pass their gates.

**Exit:** A user can create, edit, reload, and resume a private cross-stitch design with measured responsive behavior.

## Milestone 4 — palettes and physical threads

- Add user-managed brands/products and optional pattern-color mappings.
- Add palette validation, symbols, substitutions, and material estimates.
- Do not bundle third-party thread catalogs without a recorded license/provenance decision.

**Exit:** A pattern remains valid with visual-only colors and can optionally map them to user-entered physical products.

## Milestone 5 — route and fabric views

- Implement route options and a deterministic baseline routing algorithm in the engine.
- Add route sets/steps, stale detection, worker execution, and explicit recompute.
- Render front-of-fabric and clearly labeled estimated back-of-fabric views.

**Exit:** A checkpoint has reproducible front/back views and route-based estimates; edits visibly invalidate stale derived data.

## Milestone 6 — stitch progress

- Add per-user progress trackers and element marks tied to stable IDs/revisions.
- Add progress filters, totals, bulk mark/unmark, and stale-element handling.
- Test progress isolation and behavior across edits/checkpoints.

**Exit:** Users can safely resume work without progress leaking to another account or silently attaching to changed stitches.

## Milestone 7 — exports

- Define and approve initial formats; begin with a printable pattern format before machine-embroidery formats.
- Generate immutable revision-pinned artifacts in bounded jobs.
- Add page tiling, legends, symbols, checksums, retention, and authorized download tests.

**Exit:** The same pattern revision produces a reproducible, private export with a complete legend.

## Milestone 8 — image and pattern imports

- Add strict upload limits and isolated decoding.
- Implement a deterministic non-AI image-to-cross-stitch pipeline with crop, sampling, quantization, palette mapping, and preview/confirmation.
- Add external pattern formats one at a time only after format and license review.

**Exit:** Import is bounded, cancelable, reproducible, and never mutates a project before user confirmation.

## Milestone 9 — Synology release readiness

- Create pinned production images and Compose configuration; configure DSM reverse proxy/TLS instructions.
- Establish resource budgets, health checks, log rotation, upgrade/rollback, off-device backup, and restore runbooks.
- Run migration, load, restart, disk-full, backup/restore, and multi-day soak tests on or equivalently constrained to the DS923+.

**Exit:** A clean install, upgrade, rollback/recovery, and restore are repeatable without source code or development tooling on the NAS.

## Later, separately approved

- Sharing, organizations, and simultaneous collaboration.
- Additional stitch techniques and machine-embroidery file formats.
- Offline/PWA synchronization.
- WebGL renderer if the Canvas 2D benchmark gate fails.
- Optional AI adapters using the proposal/validation/confirmation boundary.

## First milestone acceptance summary

Milestone 1 intentionally starts with the engine rather than the UI or database. It validates the coordinate, technique, command, and serialization contracts that every later layer depends on, while remaining small enough to test exhaustively and replace before user data exists.
