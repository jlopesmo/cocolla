# ADR 0009 — User-importable thread catalogs and local persistence

**Status:** Accepted

**Date:** 2026-10-18

**Decision scope:** COC.4.3 Stage 2

## Context

Cocolla users need to bring their own legally obtained thread catalogs without waiting for a bundled manufacturer dataset or the postponed server/database milestone. Catalog identity, provenance, approximate screen colors, and product assignments must remain portable while browser persistence stays an editor concern. Catalog installation, switching, and deletion must not mutate pattern documents or silently replace physical-thread identifiers.

## Decision

- Define portable `cocolla.thread-catalog` format version 1 independently from React, IndexedDB, the stitch engine, and persistence records. The format carries a stable user namespace, manufacturer/brand, line, immutable catalog version, complete attribution, rights-confirmation metadata, and provider-qualified stable product IDs.
- Use canonical deterministic JSON as the lossless backup and transfer format. Reject unknown fields, malformed/future formats, invalid identifiers, invalid exact sRGB HEX values, duplicate IDs/codes, impossible dates, absent rights confirmation, empty catalogs, files over 5 MiB, and catalogs over 10,000 products.
- Support a dependency-free bounded CSV profile with required `code,name,hex` columns and correct UTF-8 BOM, CRLF/LF, quoting, comma, escaped-quote, and embedded-line handling. CSV catalog metadata is supplied explicitly in the import workflow; validation is all-or-nothing with structured row diagnostics.
- Store user catalogs in native IndexedDB through a repository port. Keep catalog manifests, products, and active selection in separate stores with atomic write/delete transactions. Reimporting identical canonical content is idempotent; reusing an identity/version for different content is rejected.
- Use IndexedDB rather than `localStorage` because catalog records need asynchronous structured storage, larger practical capacity, indexes, and transactions. Existing small renderer preferences may continue using `localStorage`; thread catalogs may not.
- Keep catalog releases immutable. Selecting, deleting, or restoring a catalog changes the active provider only. Pattern Document v1 remains unchanged and retains unresolved `threadProductId` strings exactly.
- Require an explicit user statement confirming the right to use imported data. Preserve source, publisher, retrieval, license, redistribution, and notes fields. The confirmation is an instruction and audit field, not Cocolla legal clearance or permission to redistribute.
- Reuse the accepted provider interface and CIEDE2000 matcher. Do not add catalog-constrained image conversion, server synchronization, PostgreSQL, a third-party CSV/IndexedDB dependency, or DMC/manufacturer data.

## Storage and migration

Portable format version, IndexedDB schema version, and the user's catalog release version are independent. IndexedDB schema changes use forward-only atomic upgrade transactions. The portable JSON document remains authoritative for future migration to a server repository; browser storage keys never enter pattern or catalog interchange formats.

Browser catalog storage belongs to one origin/profile, may be cleared or quota-limited, and is not a backup. The interface must keep canonical JSON export prominent and report unavailable storage, quota failure, integrity failure, and version conflicts explicitly.

## Consequences

- Users can maintain multiple local catalog identities and versions, switch providers, search or match imported products, and restore them after a browser reload without a backend.
- Removing or switching a provider may make assignments unresolved but cannot delete or rewrite them. Reinstalling and selecting the matching provider resolves them again without a pattern revision.
- Imported values remain user-supplied approximate display colors. No catalog is described as official merely because it imports successfully.
- A future PostgreSQL implementation can implement the same repository concepts and ingest the portable document without depending on IndexedDB internals.
- Native IndexedDB and the internal CSV parser add no package or repository reference, so `repoinspire.md` does not change.

## References

- [Stage 2 architecture and implementation plan](../architecture/coc4-user-catalog-import-plan.md)
- [ADR 0008 — Thread catalog foundation and palette management](0008-thread-catalog-foundation-and-palette-management.md)
- [ICM current state](../icm/current-state.md)
