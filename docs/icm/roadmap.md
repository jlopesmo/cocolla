# Cocolla Roadmap

## Completed

- COC.1 Milestone 0 — architecture approval and recorded foundations.
- COC.1 Milestone 1 — engine kernel and versioned pattern document contract.
- COC.2 — first functional visual pattern editor with React, Vite, layered Canvas 2D, engine-backed editing, local undo/redo, and JSON import/export.
- COC.2.1 — actual-container fit/centering and engine-backed 90°/180° pattern rotation.
- COC.4.1 — stitch appearance controls, portable editable chart symbols, multi-color isolation, and occupied-cell tint; squash-merged through PR #3.
- COC.4.2 — bounded local PNG/JPEG/WebP conversion into native editable full-cross patterns, direct pointer-anchored wheel zoom, and an expanded vector-backed chart-symbol library; completed after PR #5 was squash-merged at `cea02eb66ef0cd8624cb3d54be4a656ebcadfb7e`.
- COC.4.3 Stage 1 — catalog-independent searchable synthetic provider, deterministic CIEDE2000 matching, portable assignments, explicit logical-color replacement, unresolved-entry handling, and editor integration; implemented on `feat/coc4-thread-catalog-foundation` pending review.

## Next — requires separate authorization

- Private persistence vertical slice with Fastify, PostgreSQL, authentication, ownership enforcement, RLS, migrations, and cross-user isolation tests. This was previously numbered Milestone 2 but was explicitly deferred behind the authorized COC.2 editor.
- The bounded implementation sequence and remaining dependency-selection gates are recorded in `docs/architecture/coc3-private-persistence-plan.md`; implementation requires separate authorization.
- COC.4.3 verified-catalog integration — approve the exact DMC or alternative catalog artifact, redistribution rights, attribution, trademark treatment, product-line scope, version, and update policy before adding real manufacturer data. The [proposal](../architecture/coc4-thread-catalog-plan.md) records the remaining source/licensing gate. No DMC catalog data is approved or bundled.

## Later

- Additional licensed or user-supplied palettes and physical thread catalogs beyond the first approved provider.
- Stitching routes and front/estimated-back views beyond the initial engine interfaces.
- Per-user progress, exports, imports, and Synology release hardening.
- Optional AI adapters only after a separate decision.
