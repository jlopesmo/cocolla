# COC.4.3 Stage 2 — user-importable thread catalog proposal

**Status:** Approved and implemented on `feat/coc4-user-catalog-import`; pending review and merge
**Prepared:** 2026-10-18
**Scope:** Local CSV/JSON import, validation, browser persistence, catalog selection, and portable export

## Recommendation

Add user-importable catalogs as local providers behind the existing `ThreadCatalogProvider` contract. Use IndexedDB, not `localStorage`, for catalog records. Keep the portable catalog format, validation, and deterministic export independent of React and browser storage; keep the IndexedDB adapter in the web application boundary.

This stage must not bundle or label any data as official DMC data. Importing is initiated by the user, source/provenance fields are required, and the user must confirm that they have the right to use the data. That confirmation records the user's instruction; it is not a license determination or a redistribution grant from Cocolla.

No Pattern Document migration is needed. A pattern continues to store only a stable provider-qualified `threadProductId`. Installing, switching, updating, exporting, or deleting a catalog must never rewrite those assignments. If the selected provider cannot resolve an identifier, the existing unresolved state remains visible and the saved identifier is preserved.

## Decision boundary

Stage 2 was approved for implementation on 2026-10-18. It does not approve:

- a DMC or other manufacturer dataset;
- redistribution of an imported catalog;
- a new package dependency;
- server upload, PostgreSQL storage, account synchronization, or catalog sharing;
- changing Pattern Document v1 or the accepted CIEDE2000 algorithm.

Because no external reference or dependency is adopted by this proposal, `repoinspire.md` does not need a decision update. Any later third-party CSV parser or catalog source must be evaluated through repository-reference governance before adoption.

## Boundaries

### Portable catalog layer

`packages/contracts` should define a versioned portable user-catalog document without changing the existing provider and matcher ports. `packages/thread-catalog` should own pure parsing, validation, normalization, duplicate detection, conversion into an immutable local provider, and deterministic export.

These packages must not import React, IndexedDB, local storage, the stitch engine, Fastify, or PostgreSQL. Pure functions should accept bytes/text plus explicit import metadata and return either a complete validated catalog or structured diagnostics; they must not partially mutate storage.

### Browser application layer

`apps/web` should own:

- file selection and drag/drop;
- the import preview and rights-confirmation workflow;
- a `ThreadCatalogRepository` port and native IndexedDB adapter;
- installed-catalog/version selection;
- provider loading and lifecycle notices;
- export/download and deletion confirmation.

The current synthetic provider remains a built-in, read-only development option. Imported catalogs are separate records and cannot overwrite built-in identities.

### Engine and pattern document

No engine command or document-schema change is proposed. Assignment/removal, logical-color replacement, undo/redo, symbols, isolation, and image conversion continue to use the Stage 1 APIs. Catalog installation and selection are editor environment state, not pattern mutations, so they do not enter document history.

## Portable catalog format

### Canonical JSON

JSON is the lossless interchange and backup format. The initial contract should have an explicit media identity and independent version:

```json
{
  "format": "cocolla.thread-catalog",
  "formatVersion": 1,
  "descriptor": {
    "id": "user.my-floss",
    "brand": "Example manufacturer",
    "line": "Six-strand cotton",
    "version": "2026-10",
    "attribution": {
      "sourceName": "My licensed spreadsheet",
      "sourceUrl": null,
      "publisher": "Example publisher",
      "retrievedAt": "2026-10-18",
      "licenseName": null,
      "licenseUrl": null,
      "redistribution": "unknown",
      "notes": "Approximate screen colors supplied by the user."
    }
  },
  "rightsConfirmation": {
    "statementVersion": 1,
    "confirmed": true,
    "confirmedAt": "2026-10-18T12:00:00.000Z"
  },
  "products": [
    {
      "id": "user.my-floss:310",
      "catalogId": "user.my-floss",
      "manufacturerCode": "310",
      "name": "Example black",
      "color": {
        "colorSpace": "srgb",
        "value": "#000000",
        "provenance": "user-supplied"
      }
    }
  ]
}
```

The exact field names become normative only after approval and implementation. Export must use a canonical property order and normalized values so equal catalogs produce equal bytes. A SHA-256 content digest may be stored as import evidence and conflict detection, but it is derived metadata and should not be included in the bytes it hashes.

### Identity and versions

- `descriptor.id` is a required, user-controlled stable namespace. Reserve `cocolla.*` for built-in data and validate imported IDs against a documented lowercase token grammar.
- `descriptor.version` is required and identifies one immutable release of that catalog namespace.
- Storage keys use the compound `(catalogId, catalogVersion)` pair. Reimporting identical canonical bytes is an idempotent no-op. Reusing the same pair for different content is an error; the user must choose a new version rather than silently overwrite history.
- Product IDs remain version-independent so assignments can resolve across catalog releases. For CSV imports, generate the product suffix deterministically from the normalized manufacturer code; JSON exports preserve the generated ID explicitly.
- Manufacturer codes are display data but are unique within a catalog after Unicode normalization, trimming, and locale-independent case folding. A later code change is an explicit product-identity change, not an automatic alias.

### CSV profile

CSV is an import convenience format, not the complete portable manifest. The import wizard collects catalog identity, manufacturer/brand, line, version, provenance, and rights confirmation separately. Required headers are:

| Header | Rule |
| --- | --- |
| `code` | Required, non-empty, unique within the catalog |
| `name` | Required, non-empty display name |
| `hex` | Required exact six-digit sRGB value, accepted with `#` and normalized to uppercase `#RRGGBB` |

Optional initial headers may include `product_id` and `color_provenance`. Unknown headers should be retained only if an approved extension contract exists; otherwise report them as ignored warnings rather than inventing product fields.

The parser should handle UTF-8 BOM, CRLF/LF, quoted commas, escaped quotes, and quoted newlines. A small bounded finite-state parser is sufficient and avoids a dependency, but it requires adversarial fixtures. If implementation instead proposes a third-party parser, evaluate its exact version, license, browser size, maintenance, and security history in `repoinspire.md` first.

## Validation and diagnostics

Validation is all-or-nothing before persistence. The preview should show valid row count, warnings, errors, descriptor/provenance, and several swatches. Each diagnostic carries a stable code, severity, row (when applicable), field, and plain-language message.

Initial rules:

- accept UTF-8 JSON/CSV only; reject malformed encodings and malformed syntax explicitly;
- impose reviewed file-size and product-count limits before parsing (proposed starting bounds: 5 MiB and 10,000 products);
- require a non-reserved catalog identity, manufacturer/brand, line, version, source name, publisher, and rights confirmation;
- trim and NFC-normalize user text; reject control characters, empty required values, and documented length overflows;
- accept only finite, exact six-digit sRGB HEX values and normalize them to uppercase;
- reject duplicate catalog-version keys, product IDs, and manufacturer codes (codes compare after normalization and case folding);
- require every product's `catalogId` and ID prefix to agree with the descriptor;
- reject path-like or ambiguous identity tokens and IDs that cannot round-trip canonically;
- permit equal names and equal colors as warnings or normal data; neither proves duplicate products;
- validate attribution URLs as optional HTTP(S) URLs without fetching them;
- never execute imported formulas, markup, URLs, or scripts. React renders all imported text as text.

Error reports should be downloadable as JSON. The UI may cap displayed diagnostics, but validation must report the total count. No catalog is saved while any error exists.

## IndexedDB storage

### Why IndexedDB

IndexedDB is the appropriate first store because catalog data is structured, can exceed the practical size of synchronous string-only `localStorage`, and needs atomic multi-record writes and indexed retrieval. IndexedDB is asynchronous and therefore avoids blocking the main thread during ordinary persistence. It also maps more cleanly to a future repository backed by PostgreSQL.

`localStorage` remains suitable for small renderer preferences, but not catalog products. It has synchronous access, coarse quota behavior, no transactions across structured records, and would require serializing and rewriting whole catalogs. Catalog metadata and the active selection should live in IndexedDB together so the committed catalog and selection cannot reference half-written data.

Browser persistence is profile- and origin-local, may be cleared or evicted, and is not a backup. The UI must say this plainly and make JSON export prominent.

### Proposed object stores

Use one database with a storage schema version independent from portable format versions:

- `catalogVersions`, keyed by `[catalogId, version]`: descriptor, rights-confirmation record, import timestamp, canonical digest, product count, and format version;
- `catalogProducts`, keyed by `[catalogId, version, productId]`, with indexes for the catalog-version pair and normalized manufacturer code;
- `catalogSettings`, keyed by a fixed setting name: selected catalog/version and future local catalog preferences.

Import writes the manifest and all products in one read-write transaction. A failed parse, validation, quota check, abort, or write leaves no partial catalog. Deleting a catalog version uses one transaction and never edits open or saved patterns.

The selected catalog is loaded into the existing immutable local provider. Stage 2 can initially scan a loaded catalog for substring search and CIEDE2000 matching, with Lab values cached by canonical digest and matcher version after profiling. Do not persist a cache as authoritative data; it is disposable and must be invalidated when either version changes.

## Selection, resolution, and switching

- Browsing and nearest-color matching use the explicitly selected catalog version.
- Assignment resolution uses a provider registry keyed by catalog identity and its user-selected installed version. It does not fall back silently to a different catalog or substitute a nearest product.
- Switching catalogs changes only the browser/matcher provider. It does not change logical colors, symbols, isolation, stitches, history, or `threadProductId` values.
- When the selected version lacks an assigned product, show the existing unresolved state and offer explicit version selection, replacement, removal, or reimport actions.
- Deleting an installed version warns how many currently open assignments it resolves when that information is available, but deletion still leaves assignment strings intact.
- Importing a catalog that can resolve a previously unknown product should make it resolve on the next provider refresh without a pattern revision.

## Export and portability

Canonical JSON export is required in the first slice and contains the full catalog, descriptor, attribution, and rights-confirmation record. The export dialog must repeat that Cocolla does not grant redistribution rights and that the user is responsible for where the exported file is shared.

CSV export may be offered later as a product-table convenience, but it is not a complete backup because catalog-level provenance and confirmation would be lost. If CSV export is added, guard against spreadsheet formula injection for cells beginning with `=`, `+`, `-`, or `@`, while ensuring a JSON round trip remains exact.

The same JSON contract is the future bridge to server persistence: a later PostgreSQL repository imports a validated portable document rather than reading IndexedDB internals. No IndexedDB key or browser-specific field belongs in the portable format.

## Migration strategy

Three versions remain separate:

1. portable catalog `formatVersion` controls file parsing and deterministic export;
2. IndexedDB schema version controls local object-store upgrades;
3. catalog descriptor `version` identifies the user's catalog release.

IndexedDB upgrades run in the browser's atomic upgrade transaction. Migrations must be forward-only, fixture-tested, and preserve canonical imported content. Unsupported future portable versions fail before writes. Before any later destructive storage migration, prompt for or automatically offer catalog JSON export; Stage 2's initial schema requires no destructive migration.

Built-in synthetic data is never copied into the user store. Existing Pattern Document assignments require no migration. If local storage is unavailable, the app remains usable with built-in providers and can still preview/import for the current session only if that fallback is explicitly designed; it must not claim persistence.

## User workflow

1. Open **Manage catalogs** and choose JSON or CSV.
2. Select a local file; Cocolla reads it locally and makes no network request.
3. For CSV, enter catalog identity, manufacturer, line, version, and provenance. For JSON, review the embedded values.
4. Review normalized swatches, product count, duplicates, warnings, and row-level errors.
5. Confirm: “I have the right to use this data in Cocolla.” The UI clarifies that confirmation does not make the catalog official or redistributable.
6. Save in one IndexedDB transaction, then optionally select the imported version.
7. Browse/search it and use the existing CIEDE2000 matcher, assignment, replacement, undo/redo, symbol, and isolation behavior.
8. Export canonical JSON for backup/transfer, switch versions explicitly, or delete local data without changing patterns.

## Minimal first implementation slice

Deliver one bounded vertical slice before image-conversion assistance or server sync:

1. Add portable catalog v1 TypeScript/runtime contracts plus canonical JSON import/export.
2. Add the bounded CSV profile, pure parser, normalization, structured diagnostics, duplicate detection, and all-or-nothing preview.
3. Add a repository port, native IndexedDB v1 adapter, and in-memory test adapter; persist multiple immutable catalog versions and one active selection.
4. Add **Manage catalogs** UI for import preview, provenance, rights confirmation, selection, JSON export, and deletion.
5. Adapt a selected imported catalog to the existing provider and matcher; preserve unresolved assignments across selection, deletion, reload, and export/import.
6. Verify that physical assignments, logical color replacement, symbols, visibility/isolation, undo/redo, image-created patterns, and canonical pattern JSON remain compatible.

Explicitly defer bulk image-palette matching, catalog-constrained quantization, aliases/discontinued products, server synchronization, catalog sharing, and verified DMC data.

## Validation plan

- Parser fixtures: UTF-8 BOM, CRLF/LF, quoting, escaped quotes, embedded newlines, malformed rows, invalid encoding, oversized files, and future format versions.
- Validation: missing metadata, invalid/reserved IDs, invalid HEX, duplicate code/ID, mismatched catalog IDs, control characters, length limits, and rights-confirmation absence.
- Determinism: canonical JSON byte equality, import/export/import equality, stable CSV-generated product IDs, and digest repeatability.
- Repository: transaction rollback, idempotent reimport, same-key/different-content conflict, quota/storage errors, version migration, catalog deletion, and selection recovery.
- Integration: catalog search and switching, CIEDE2000 ordering, reload persistence, unresolved-to-resolved and resolved-to-unresolved transitions, pattern JSON preservation, and no implicit document revisions.
- Browser behavior: private/blocked storage messaging, large-catalog responsiveness, import cancellation, stale async request suppression, accessible diagnostics, and no network requests during import.
- Security: imported text is never interpreted as HTML/code; URL fields are not fetched; exported CSV, if implemented, is safe for spreadsheet opening.

Report representative import time, selection/load time, matching time, storage size, and peak-memory observations. Do not set performance guarantees until representative catalog sizes and browsers are measured.

## Risks and alternatives

| Risk | Mitigation |
| --- | --- |
| Browser storage is cleared or quota-limited | Prominent JSON backup/export, transactional errors, no false persistence claim, future server repository behind the same port. |
| User imports proprietary or inaccurate data | Explicit local-file provenance, rights confirmation, no Cocolla endorsement, approximate-color labeling, no bundled unverified data. |
| Catalog updates silently change matches | Immutable `(id, version)` records, canonical digest, explicit switching, versioned matcher, no overwrite. |
| CSV ambiguity corrupts rows | Narrow documented profile, robust quoted-field parser, preview, structured errors, all-or-nothing save. |
| Large imports block the editor | Early byte/row bounds, parsing/matching profiling, optional worker move after measurement, IndexedDB async writes. |
| Removing/switching catalogs loses assignments | Pattern stores independent stable IDs; unresolved state is preserved without mutation. |
| IDs generated from codes drift | Document normalization rules, reject normalized duplicates, preserve explicit IDs in JSON, treat code changes as explicit identity changes. |
| IndexedDB schema couples future PostgreSQL | Repository port and portable JSON are authoritative; browser keys and migrations remain adapter details. |

`localStorage` is the rejected catalog-store alternative. A single JSON blob is simpler initially but becomes synchronous, quota-fragile, and rewrite-heavy, and offers no atomic indexed product storage. An immediate PostgreSQL implementation is also rejected for this slice because it would couple local catalog use to the postponed backend and violate the offline/local requirement.

## Approved implementation decisions

The 2026-10-18 Stage 2 authorization approved the portable JSON v1 contract and ID grammar, native IndexedDB persistence, the 5 MiB/10,000-product bounds, the bounded CSV profile, explicit rights confirmation, canonical JSON-only catalog export, the minimal vertical slice, and its recorded deferrals. ADR 0009 records the implemented decision.
