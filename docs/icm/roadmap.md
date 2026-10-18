# Cocolla Roadmap

## Completed

- COC.1 Milestone 0 — architecture approval and recorded foundations.
- COC.1 Milestone 1 — engine kernel and versioned pattern document contract.
- COC.2 — first functional visual pattern editor with React, Vite, layered Canvas 2D, engine-backed editing, local undo/redo, and JSON import/export.
- COC.2.1 — actual-container fit/centering and engine-backed 90°/180° pattern rotation.
- COC.4.1 — stitch appearance controls, portable editable chart symbols, multi-color isolation, and occupied-cell tint; squash-merged through PR #3.

## Implemented on feature branch — pending review

- COC.4.2 — bounded local PNG/JPEG/WebP conversion into native editable full-cross patterns on `feat/coc4-image-import`.

## Next — requires separate authorization

- Private persistence vertical slice with Fastify, PostgreSQL, authentication, ownership enforcement, RLS, migrations, and cross-user isolation tests. This was previously numbered Milestone 2 but was explicitly deferred behind the authorized COC.2 editor.
- The bounded implementation sequence and remaining dependency-selection gates are recorded in `docs/architecture/coc3-private-persistence-plan.md`; implementation requires separate authorization.

## Later

- Palettes and optional physical thread mappings.
- Stitching routes and front/estimated-back views beyond the initial engine interfaces.
- Per-user progress, exports, imports, and Synology release hardening.
- Optional AI adapters only after a separate decision.
