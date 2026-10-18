# COC.4.3 thread catalog and color matching proposal

**Status:** Proposed; implementation and data bundling are not authorized  
**Prepared:** 2026-10-18  
**Scope:** DMC source research, physical-thread assignments, and perceptual matching

## Recommendation

Keep the catalog boundary accepted in ADR 0007 and implement DMC as one replaceable local provider, not as engine-owned data. The preferred source is a written redistribution license or data agreement from DMC covering product codes, names, approximate digital colors, update rights, attribution, and trademark use. DMC's own material is authoritative for product identity, but its published website terms prohibit reproducing DMC color cards and other website content without prior written consent. The official 2021 numerical list supplies codes and descriptions, not a reusable digital-color license.

If direct permission is unavailable, `makebead/craft-color-codes` is the best open-data candidate found in this review. It publishes a 489-color DMC compilation under CC BY 4.0, carries per-palette source notes, and distinguishes its screen colors as cross-checked approximations. It is not yet approved for Cocolla bundling: its DMC values derive from community sources including `adrianj/CrossStitchCreator`, and this review did not establish redistribution rights for every upstream contribution. A compilation license does not by itself resolve rights in upstream material.

Therefore, do not bundle DMC data until one of these gates passes:

1. DMC grants suitable written permission; or
2. project review accepts the MakeBead provenance and CC BY 4.0 chain, including required attribution and trademark treatment; or
3. another source provides clearer rights and at least equivalent provenance.

User-supplied catalogs may be supported later, but moving the import step to the user is not a substitute for validating files that Cocolla itself redistributes.

## Research findings

Reviewed on 2026-10-18. Licensing notes are engineering risk findings, not legal advice.

| Source | What it provides | Rights/provenance finding | Decision |
| --- | --- | --- | --- |
| [DMC printed color card](https://www.dmc.com/US/en/products/printed-color-card) and [Article 117 numerical list](https://www.dmc.com/media/color_charts/DMC_Embroidery_Floss_Numerical_List_2021.pdf) | Manufacturer product identity, codes, descriptions, and current/dated range evidence | Authoritative, but the [DMC terms](https://wholesale.dmc.com/terms-and-conditions) expressly restrict reproduction of website content and color cards without written consent. No reusable RGB/HEX license was found. | Verification source only unless DMC grants permission. |
| [`makebead/craft-color-codes`](https://github.com/makebead/craft-color-codes) | 489 DMC entries, approximate RGB/HEX, source notes, JSON/CSV, and an explicit CC BY 4.0 data license | Best documented open candidate. The DMC palette is cross-checked rather than physically measured; upstream community-source rights remain insufficiently demonstrated for approval. The repository is also young and has limited independent review. | Retain as a candidate; no dependency or data adoption. |
| [`sharlagelfand/dmc`](https://github.com/sharlagelfand/dmc) | 454-entry R dataset and several distance methods | MIT covers the package code. Its data-generation script identifies `adrianj/CrossStitchCreator` as the source and includes manual trial-and-error corrections; no separate dataset license or complete provenance was established. | Reject as a bundled catalog source. Useful only as historical algorithm research. |
| [`adrianj/CrossStitchCreator`](https://github.com/adrianj/CrossStitchCreator) | 455-line DMC-to-RGB CSV | No repository license or original measurement/source documentation was found during review. | Reject for reuse. |
| [`seanockert/rgb-to-dmc`](https://github.com/seanockert/rgb-to-dmc) | DMC JSON and an RGB matcher | No repository license was found; the README points to third-party web charts rather than a reproducible measurement method. | Reject for reuse. |
| [`zilliah/embroidery-floss-api`](https://github.com/zilliah/embroidery-floss-api) | Partial “basic” DMC API data | No repository license or complete current range was found. | Reject for reuse. |

Manufacturer pages currently disagree on whether the relevant solid range contains 485, 489, or 500 colors across regions/products. This reinforces that every catalog artifact must identify the product line, source URLs, retrieval date, upstream edition, included/excluded product types, and immutable catalog version. A count alone is not sufficient version evidence.

Approximate RGB/HEX values are screen proxies, not measured thread appearance. Fiber sheen, dye lots, lighting, fabric, strand count, camera profiles, and monitor calibration all affect perception. Cocolla must label matches as approximate and keep manual selection authoritative.

## Proposed architecture

### Boundaries

- `packages/contracts` retains the catalog-neutral `ThreadCatalogProvider`, `ThreadCatalogDescriptor`, `ThreadProduct`, and `ThreadColorMatcher` ports introduced by ADR 0007.
- A new UI-independent `packages/thread-catalog` package owns catalog validation, local provider behavior, sRGB-to-Lab conversion, CIEDE2000, deterministic ranking, and catalog indexes. It must not import React, Canvas, browser storage, Fastify, PostgreSQL, or the stitch engine.
- Approved immutable data would live under `catalogs/<provider>/<catalog-version>/` with its own manifest, source URLs, retrieval date, license text/notice, checksum, product-line scope, and generation notes. No data directory is created until a source is approved.
- `packages/engine` owns an immutable, revision-checked `color.set-thread-product` command because `PatternColorV1.threadProductId` is portable pattern data. The engine validates only the provider-qualified identifier; it does not need a catalog installed.
- `apps/web` owns browsing, search, match presentation, confirmation, unresolved-assignment warnings, and editor integration.

Suggested provider-qualified product IDs use a stable namespace and product identity, for example `dmc.article-117:310`. Catalog versions belong in the provider descriptor rather than the product ID so the same physical product can resolve across catalog updates.

### Portable assignments and version drift

The existing version 1 document can carry the stable product ID without a schema migration. A missing provider or removed product must leave that string intact and show an unresolved state; it must never clear or silently substitute the assignment.

For the minimal slice, the logical color remains authoritative for rendering and survives without a catalog. Exact matching inputs are reproducible from the logical RGB plus an immutable provider version. If offline exports later need the assigned product name/color and source version to remain exactly as seen at assignment time, propose a Pattern Document v2 snapshot field in a separate ADR rather than hiding typed data in an extension.

Catalog releases are immutable. Publishing changed names, colors, or availability creates a new descriptor version and checksum. Providers may expose aliases and discontinued status, but stable product IDs cannot be recycled. Tests must cover an assignment resolving in one version, remaining stable in a newer version, becoming unresolved, and being explicitly replaced by the user.

### Perceptual color matching

Use a dependency-free, pure CIEDE2000 implementation:

1. Parse and clamp validated `#RRGGBB` sRGB values.
2. Linearize sRGB, convert through XYZ D65, chromatically adapt to D50, and convert to CIE Lab using the W3C Color 4 conversion model.
3. Rank products by ΔE00 with all parametric weights set to 1.
4. Break equal-distance ties deterministically by normalized manufacturer code and then stable product ID.
5. Return the algorithm key and version already required by `ThreadColorMatch` (proposed key: `ciede2000-srgb-d50`, version `1`).

Validate the implementation against the 34 paired Lab values published by Sharma, Wu, and Dalal, plus Cocolla conversion and tie-order fixtures. W3C Color 4 also publishes validated sample conversion and ΔE00 code. Precompute Lab values once per catalog version; scanning roughly 500 entries for each of at most 32 image-conversion colors is small enough that no spatial index or dependency is justified initially.

ΔE00 ranks the provided screen approximations; it cannot make an unmeasured catalog physically accurate. Present the numeric score and several candidates without claiming a universal “exact match” threshold.

## Product behavior

### Symbols and isolation

Chart symbols remain properties of logical pattern colors. Assigning or replacing a physical thread does not change symbols, stitches, layers, isolation selection, or display preferences. Catalog filtering and color isolation are separate concerns: the former searches products, while the latter controls which logical colors are emphasized on the canvas.

### Assignments and replacement

- Browse by code/name and request nearest candidates for the active logical color.
- Show product code, name, approximate swatch, source/catalog version, ΔE00, and an approximation warning.
- Assign, replace, or clear a thread product through one revisioned engine command and existing undo/redo history.
- Replacing an assignment changes only `threadProductId`. A future bulk replacement must preview the affected logical colors and require confirmation.
- Discontinued or unavailable products remain visible as assigned, with a warning and an explicit replacement action.

### Palette remapping

Physical assignment and logical palette remapping are different operations:

- **Assignment** records which product a user intends to buy; it does not change `PatternColorV1.rgb` or merge colors.
- **Remapping** changes logical RGB values and therefore the visual pattern. It requires a separate, previewable, undoable command. Multiple logical colors must not be silently merged merely because they map to one product.

The first slice implements assignment only. Explicit palette remapping and merge choices are later work.

### Image conversion

Keep the current image quantizer independent of any vendor catalog. After normal quantization, COC.4.3 may offer DMC suggestions for each resulting logical color and apply only confirmed assignments. A later “quantize directly to this catalog” mode would be a distinct, versioned conversion algorithm with its own preview and tests; it is not part of the first slice.

## Proposed implementation stages

### Stage 0 — source approval gate

- Obtain DMC permission or approve another source after provenance/license review.
- Freeze the exact upstream revision/artifact and record attribution, checksum, product-line scope, and update policy.
- Update `repoinspire.md` from candidate/rejected research to the approved adoption decision.

**Exit:** Cocolla has documented authority to redistribute the exact catalog artifact. Without this exit, implementation may use synthetic fixtures only and must not ship DMC data.

### Stage 1 — minimal vertical slice

- Add pure sRGB/Lab and CIEDE2000 functions with published reference vectors.
- Add a validated immutable local provider for the approved, source-stamped catalog artifact.
- Add deterministic search, lookup, and nearest-match APIs with cached Lab values.
- Add `color.set-thread-product` with revision, immutability, batch, serialization, and undo/redo tests.
- Add a compact thread panel for product search, top candidate display, assign/replace/clear, attribution, and unresolved states.
- Verify symbols, isolation, wheel/viewport behavior, JSON round trips, and image-created patterns remain unchanged except for explicit assignments.

**Exit:** A user can select a logical color, find an approximate physical product, explicitly assign it, undo/redo, export/import, and still open the pattern when the catalog is absent.

### Stage 2 — image-conversion assistance

- Suggest matches for a converted palette after quantization.
- Add a bulk preview with per-color overrides and one atomic confirmation.
- Cache by logical RGB, algorithm version, and catalog version; cancel stale worker/UI results.

### Stage 3 — replacement and lifecycle

- Add discontinued/alias metadata, replacement suggestions, and explicit bulk replacement.
- Add catalog-version comparison and drift reporting without rewriting documents.
- Decide whether portable assignment snapshots require Pattern Document v2.

### Stage 4 — additional providers and remapping

- Support other licensed or user-supplied catalogs through the same ports.
- Add explicit palette-remap commands and, if authorized, catalog-constrained image quantization.
- Keep provider data optional so the editor remains fully functional without any catalog.

## Validation plan

- License/manifest checks: required attribution, allowed redistribution, immutable version, checksum, unique stable IDs/codes, valid sRGB, and declared line/count.
- Color science: W3C conversion fixtures and all Sharma CIEDE2000 supplemental pairs; invalid input and deterministic tie ordering.
- Provider: code/name search, pagination, lookup, version isolation, aliases, discontinued products, and unresolved IDs.
- Engine/editor: revision conflicts, invalid IDs, atomic batch behavior, immutability, undo/redo, canonical JSON, missing catalog, assignment replacement, symbols, and isolation.
- Image workflow: suggestions never mutate a preview/current document until confirmation; cancellation and stale result tests.
- Performance: cold catalog load, cached matching of 32 colors against the full catalog, and browser interaction timing. Report measurements rather than asserting a fixed service-level target before representative hardware testing.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Catalog redistribution or trademark claim | Approval gate, exact license/permission artifact, attribution, source revision, and no bundled data before approval. |
| Community RGB values look authoritative | Label them approximate, expose provenance/version, offer multiple candidates and manual override, never call them measured unless they are. |
| Upstream catalog changes silently alter matches | Immutable local versions, checksums, algorithm versioning, deterministic ordering, and explicit update review. |
| A missing catalog corrupts a document | Preserve provider-qualified IDs and logical RGB; show unresolved state without mutation. |
| Assignment accidentally changes symbols or isolation | Separate engine command and focused integration tests; keep those features keyed to logical color IDs. |
| Image conversion becomes vendor-coupled | Match only after generic quantization in the initial integration; keep constrained quantization separate and optional. |
| ΔE00 is overinterpreted | Describe it as ranking approximate sRGB proxies, show alternatives, and keep the user's choice authoritative. |

## Decisions requiring approval

1. Whether to request written DMC redistribution permission before considering a community dataset.
2. Whether MakeBead's CC BY 4.0 compilation and upstream provenance are acceptable for redistribution if DMC permission is unavailable.
3. The exact catalog line and regional/current color set to support first.
4. CIEDE2000 over sRGB-derived D50 Lab as the version 1 matcher.
5. The Stage 1 assignment-only scope, with palette remapping and catalog-constrained quantization deferred.
6. Whether a future portable assignment snapshot warrants Pattern Document v2 after the first slice.

## Technical references

- [W3C CSS Color Module Level 4](https://www.w3.org/TR/css-color/) — sRGB/XYZ/Lab conversion and validated ΔE00 sample code.
- [Sharma, Wu, and Dalal CIEDE2000 resource page](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/) — paper, supplemental test data, and reference programs.
- [DMC terms and conditions](https://wholesale.dmc.com/terms-and-conditions) — published reproduction restrictions reviewed for this proposal.
- [`makebead/craft-color-codes` source notes](https://github.com/makebead/craft-color-codes/blob/main/SOURCES.md) and [data license](https://github.com/makebead/craft-color-codes/blob/main/LICENSE-DATA.md).

