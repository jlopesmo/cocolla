# Cocolla — ICM Index

Intent, Context, and Memory (ICM) provides the durable project information that developers and coding agents should consult before making changes.

## Core project documentation

- [Project context](context.md) — Product purpose, scope, and constraints
- [Project invariants](invariants.md) — Rules that must remain true
- [Current state](current-state.md) — Verified implementation status
- [Roadmap](roadmap.md) — Planned development milestones

## Governance and references

- [Agent instructions](../../AGENTS.md) — Agent entry point and working rules
- [Repository-reference register](../../repoinspire.md) — Project-specific reference evaluations and decisions
- [Private master catalog](https://github.com/jlopesmo/repoinspire) — Shared research and reference catalog

## Current state

The GitHub repository initially contained reference/governance documentation. On 2026-10-18, nexOS generated the local project scaffold, Git configuration, agent instructions, and ICM files. COC.1 Milestone 1 subsequently established the versioned pattern contract and UI-independent stitch-engine kernel with automated tests and benchmarks. COC.2 added the local React/Canvas visual pattern editor; COC.4.1 and COC.4.2 added appearance controls, local image conversion, wheel zoom, and catalog-neutral mapping ports. COC.4.3 Stage 1 adds catalog-independent physical-thread assignment and palette-management behavior using synthetic data only. API, persistence, deployment, and verified manufacturer thread catalogs remain unimplemented; see [current-state.md](current-state.md) for verified detail.

## Documentation discipline

- Record architectural decisions before major implementation changes.
- Update current-state.md when implementation milestones are verified.
- Keep proposed functionality distinct from completed functionality.
- Record reference adoption decisions in repoinspire.md.
- Preserve historical decisions and supporting evidence.

This index routes project documentation. It is not a substitute for the authoritative documents.
