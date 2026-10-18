# Cocolla — Agent Entry

Cocolla is intended to become a multi-user embroidery and cross-stitch design application supporting pattern creation, editing, image-to-pattern conversion, thread management, fabric visualization, exports, and stitch progress tracking. The currently implemented scope is recorded in the ICM current-state document.

This file is the entry point for coding agents operating on Cocolla. It routes agents to authoritative project documentation rather than duplicating decisions.

## Read first

- [ICM index](docs/icm/README.md)
- [Project context](docs/icm/context.md)
- [Project invariants](docs/icm/invariants.md)
- [Current state](docs/icm/current-state.md)
- [Roadmap](docs/icm/roadmap.md)
- [Repository-reference register](repoinspire.md)

## Development rules

- Read the relevant ICM documents before modifying the application.
- Preserve existing project decisions and architecture.
- Update ICM documentation when implementation changes its recorded state.
- Do not infer implemented functionality from planned features.
- Do not introduce major dependencies or architectural changes without an explicit decision.
- Keep project facts, architectural decisions, and implementation evidence in their appropriate documents.

## Repository-reference governance

Before recommending or evaluating external tools, libraries, frameworks, skills, or repositories, consult repoinspire.md.

- The project register is authoritative for Cocolla reference decisions.
- The private master catalog at https://github.com/jlopesmo/repoinspire maintains shared research and source-stamped project decisions.
- Keep candidate_reference and accepted_reference separate from actual adoption status.
- Distinguish proposed uses and priorities from user-approved decisions.
- Claim actively_using only when supported by concrete implementation evidence.
- Preserve rejection history, licensing considerations, and existing decisions.
- Update the register when references are evaluated, adopted, rejected, or retired.
- Listing a reference does not authorize installation, execution, credential access, data sharing, or deployment.

## Maintenance

Keep this document concise. Link to authoritative documentation instead of duplicating it.

Initial project scaffold created through nexOS on 2026-10-18.
