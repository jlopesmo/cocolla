# Agent Entry

**Cocolla** — Cocolla is a multi-user embroidery and cross-stitch design application for creating, importing, editing, visualizing, and managing stitching projects. Features include an interactive stitch canvas, image-to-pattern conversion, thread color management, front-and-back fabric visualization, pattern exporting, and stitch progress tracking. The modular architecture supports self-hosted deployment and future AI-assisted design features.

This file is the entry point for coding agents (Codex, Claude Code, and others). It is a router, not a container: project facts, rules, and plans live in the documents it points to.

## Read first

- [docs/icm/context.md](docs/icm/context.md) — what the project is and how it is shaped
- [docs/icm/invariants.md](docs/icm/invariants.md) — rules that must hold
- [docs/icm/current-state.md](docs/icm/current-state.md) — where things stand now
- [docs/icm/roadmap.md](docs/icm/roadmap.md) — what comes next

## Keep context true

- When a change alters what a routed document says, update that document in the same change.
- Add project-specific architecture, domains, and decisions as their own documents and link them here; do not copy them into this file.

Created by nexOS Project Creator on 2026-10-18. Maintain it like any other project file.
