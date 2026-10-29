# Cocolla repository inspiration register

<!-- catalog-schema-version: 1; project-template: templates/repoinspire.md -->
**Project:** [jlopesmo/cocolla](https://github.com/jlopesmo/cocolla)  
**Project ID:** `cocolla`  
**Master catalog:** [jlopesmo/repoinspire](https://github.com/jlopesmo/repoinspire)  
**Last register review:** 2026-10-28

## Purpose and authority

This file is the canonical project-local record of repository-reference priority, evaluation status, decisions and implementation evidence. The private master owns shared repository identity/research facts; its project summaries are source-stamped projections. Cocolla is the current project name for the earlier stitching idea. Preserve that naming history. The approved architecture and verified implementation scope are recorded in the linked architecture, ADR, and ICM documents.

This Markdown register follows the master catalog’s [schema](https://github.com/jlopesmo/repoinspire/blob/main/schema/catalog.schema.json) vocabulary and [project template](https://github.com/jlopesmo/repoinspire/blob/main/templates/repoinspire.md) authoring contract. The master catalog is authoritative for shared repository identity/research; this project file is authoritative for project decisions once published. Proposed priority is separate from user-decided priority.

Ranks are proposed project evaluation order, not GitHub Trending rank, approved work order or deadlines. `accepted_reference` means approved or retained as a reference classification; adoption status separately records whether its use is candidate, planned, active, rejected, or retired. The original imported reference remains `candidate`. TypeScript, Node.js, React, and Vite are actively used by verified COC.1/COC.2 work; Fastify, PostgreSQL, and Compose remain planned for later authorized milestones.

**Project naming history:** `stitching` → `cocolla`. This is project-label history, not a claim that a GitHub repository was renamed.

## Agent workflow

1. Read this register and the relevant ICM/ADR before recommending a tool, library, skill, framework or external repository. Check canonical identity and prior rejection/retirement history first.
2. Read the relevant entry completely, including constraints, license review state and evidence. A listed or accepted reference is not permission to install, run commands/hooks, enable MCP, transmit data, configure credentials or replace architecture.
3. When evaluating, planning, adopting, rejecting or retiring, update adoption status, decision date/reason, evidence and append-only history in the same change. `planned` needs an explicit project decision; `actively_using` needs concrete implementation/usage evidence and a selected use type.
4. Keep proposed and selected use distinct (`inspiration`, `code_reuse`, `dependency`). Keep proposed evaluation rank/tier separate from user-decided priority. Unknown decisions remain unset.
5. Preserve rejected/retired entries. Address the old reason before recommending a renamed repository or fork again; do not silently erase history.
6. Update project-local truth first, then explicitly reconcile source-stamped master projections. Never overwrite newer decisions from stale master data. Normal Git/review and authorization rules still apply.

## Adoption status

- `candidate`: retained proposal; evaluation and adoption have not been established
- `evaluating`: a bounded evaluation is underway, with scope/evidence recorded
- `planned`: an explicit project decision approves future scoped use
- `actively_using`: actual implementation or recurring usage is evidenced and verified
- `rejected`: declined for a recorded reason; preserve the record
- `retired`: prior planned/actual use ended; preserve reason and history

## Ranked references

Order is an assistant-proposed evaluation sequence. The user-decided priority is not set. Licensing notes are research observations, not legal clearance; check the exact version, component, asset, model and provider terms before reuse.

### storytold/artcraft

- **Repository ID:** `storytold/artcraft`
- **Repository URL:** https://github.com/storytold/artcraft
- **Reference classification:** `candidate_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (catalog/research review; no compatibility test)
- **Why relevant:** Canvas and mask/layer UX inspiration only
- **Adoption status:** `candidate`
- **Status decision date:** not decided
- **Status decision and reason:** candidate proposal only; no adoption decision
- **Decision evidence:** none recorded; candidate proposal only
- **Proposed use type:** `inspiration`
- **Selected use type:** undecided
- **Proposed evaluation rank:** 1
- **Proposed evaluation priority:** `future_reference`
- **Proposal rationale:** Review canvas/composition interaction patterns without selecting an execution stack or copying unlicensed assets
- **User-decided project priority:** not set
- **Priority decision date and evidence:** not set
- **Reported license:** MIT OR Apache-2.0 for source; excluded assets in NOTICE
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/storytold/artcraft/blob/main/LICENSE-MIT; https://github.com/storytold/artcraft/blob/main/NOTICE. Official README/license reviewed on 2026-10-18; component and model terms may differ
- **Constraints / incompatibilities:** No documented thread mapping, embroidery export or CAD/BIM core. Bundled third-party assets and model/provider rights are separate
- **Research evidence:** https://github.com/storytold/artcraft/blob/main/README.md; https://github.com/storytold/artcraft/blob/main/LICENSE-MIT; https://github.com/storytold/artcraft/blob/main/NOTICE
- **Possible later use notes:** optional creative reference
- **Adoption scope:** none approved
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** no verified aliases or fork relationship recorded; unknown is not proof of absence

### facebook/react

- **Repository ID:** `facebook/react`
- **Repository URL:** https://github.com/facebook/react
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official documentation/license review and verified COC.2 build/browser test)
- **Why relevant:** Component framework for the Cocolla web application shell and editor controls
- **Adoption status:** `actively_using`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** React 19.3.1 is implemented for the COC.2 application shell and editor controls
- **Decision evidence:** `package.json`; `package-lock.json`; `apps/web`; `docs/decisions/0002-visual-pattern-editor.md`; passing production build and browser QA
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 2
- **Proposed evaluation priority:** `foundation_candidate`
- **Proposal rationale:** Suitable for state-driven application UI while the dense stitch surface remains outside a component-per-stitch DOM model
- **User-decided project priority:** approved and implemented for COC.2
- **Priority decision date and evidence:** 2026-10-18; COC.2 implementation authorization
- **Reported license:** MIT
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/facebook/react/blob/main/LICENSE; React and React DOM 19.3.1 are pinned in `package-lock.json`
- **Constraints / incompatibilities:** React must not become the stitch-engine or per-stitch scene model; Canvas rendering remains imperative and isolated from per-stitch React components
- **Research evidence:** https://react.dev/learn/typescript; https://react.dev/learn/escape-hatches; https://github.com/facebook/react/blob/main/README.md
- **Possible later use notes:** expand the current shell with persistence, catalogs, progress, and other approved panels
- **Adoption scope:** COC.2 application shell, inspectors, dialogs, tools, and accessible controls
- **Implementation or usage references:** `package.json`; `package-lock.json`; `apps/web/src`
- **Upstream aliases / fork relationship:** the canonical repository URL currently uses `facebook/react`; no fork relationship applies

### vitejs/vite and vitejs/vite-plugin-react

- **Repository ID:** `vitejs/vite`; `vitejs/vite-plugin-react`
- **Repository URL:** https://github.com/vitejs/vite; https://github.com/vitejs/vite-plugin-react
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official package/repository/license review and verified COC.2 build)
- **Why relevant:** Development server, production bundler, and React Fast Refresh integration for the local web editor
- **Adoption status:** `actively_using`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** Vite 8.3.4 and `@vitejs/plugin-react` 6.1.2 were explicitly authorized and implemented for COC.2
- **Decision evidence:** `package.json`; `package-lock.json`; `apps/web/vite.config.ts`; passing `npm run dev` and `npm run build`
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 3
- **Proposed evaluation priority:** `coc2_tooling`
- **Proposal rationale:** Provides a standard minimal React/TypeScript development and static production build workflow without coupling application code to a server framework
- **User-decided project priority:** approved and implemented for COC.2
- **Priority decision date and evidence:** 2026-10-18; COC.2 implementation authorization
- **Reported license:** MIT for Vite and `@vitejs/plugin-react`
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/vitejs/vite/blob/main/LICENSE; https://github.com/vitejs/vite-plugin-react/blob/main/LICENSE; exact versions are pinned in `package-lock.json`
- **Constraints / incompatibilities:** Vite is development/build tooling only; it does not define the production API or Synology deployment architecture
- **Research evidence:** https://vite.dev/guide/; https://github.com/vitejs/vite/blob/main/packages/vite/package.json; https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react
- **Possible later use notes:** retain for the SPA build unless an explicit architecture decision replaces it
- **Adoption scope:** local development server, React transformation/Fast Refresh, and production static bundle
- **Implementation or usage references:** `package.json`; `package-lock.json`; `apps/web/vite.config.ts`; `apps/web/index.html`
- **Upstream aliases / fork relationship:** Vite and its official React plugin are separate canonical repositories in the same upstream organization

### microsoft/TypeScript

- **Repository ID:** `microsoft/TypeScript`
- **Repository URL:** https://github.com/microsoft/TypeScript
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official documentation/license review; no compatibility test)
- **Why relevant:** Proposed shared implementation language for the web, API, contracts, and UI-independent stitch engine
- **Adoption status:** `actively_using`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved and implemented for the versioned document contract, stitch engine, and COC.2 editor
- **Decision evidence:** `package.json`; `package-lock.json`; `tsconfig.base.json`; `packages/contracts`; `packages/engine`; `apps/web`
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 3
- **Proposed evaluation priority:** `foundation_candidate`
- **Proposal rationale:** Enables shared domain vocabulary and strict boundary checking across browser and server without coupling the engine to either
- **User-decided project priority:** approved and implemented for COC.1 and COC.2
- **Priority decision date and evidence:** 2026-10-18; COC.1/COC.2 authorization and verified builds
- **Reported license:** Apache-2.0
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt; TypeScript 5.9.3 is pinned in `package-lock.json`
- **Constraints / incompatibilities:** Types do not replace runtime validation; compiler settings and emitted module format require an explicit decision
- **Research evidence:** https://www.typescriptlang.org/docs/; https://react.dev/learn/typescript
- **Possible later use notes:** shared contracts, deterministic engine packages, and application modules
- **Adoption scope:** strict TypeScript 5.9.3 for contracts, engine, editor, tests, and benchmarks
- **Implementation or usage references:** `package.json`; `package-lock.json`; `tsconfig.json`; `tsconfig.base.json`; `packages/contracts/src`; `packages/engine/src`; `apps/web`
- **Upstream aliases / fork relationship:** no verified aliases or fork relationship recorded; unknown is not proof of absence

### fastify/fastify

- **Repository ID:** `fastify/fastify`
- **Repository URL:** https://github.com/fastify/fastify
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official documentation/license review; no compatibility test)
- **Why relevant:** Proposed HTTP framework for the modular-monolith API
- **Adoption status:** `planned`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved as the intended API framework; backend implementation is not authorized or started
- **Decision evidence:** `docs/architecture/application-architecture.md`; COC.1 architecture approval on 2026-10-18
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 4
- **Proposed evaluation priority:** `foundation_candidate`
- **Proposal rationale:** Schema-oriented API boundary, TypeScript support, and low runtime overhead suit a small self-hosted modular monolith
- **User-decided project priority:** approved for the future backend milestone; not yet authorized for implementation
- **Priority decision date and evidence:** 2026-10-18; COC.1 architecture approval
- **Reported license:** MIT
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/fastify/fastify/blob/main/LICENSE; official plugins and exact versions require separate compatibility/license checks
- **Constraints / incompatibilities:** Major-version support follows supported Node.js lines; plugins vary in typing and maintenance
- **Research evidence:** https://fastify.dev/docs/latest/; https://fastify.dev/docs/latest/Reference/TypeScript/; https://fastify.dev/docs/latest/Reference/LTS/
- **Possible later use notes:** same-origin API and static SPA host, with a separate worker entry point from the same codebase
- **Adoption scope:** future modular-monolith HTTP API; no current installation
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** no verified aliases or fork relationship recorded; unknown is not proof of absence

### nodejs/node

- **Repository ID:** `nodejs/node`
- **Repository URL:** https://github.com/nodejs/node
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official release-policy/license review; no compatibility test)
- **Why relevant:** Required runtime candidate for the proposed Fastify API and worker
- **Adoption status:** `actively_using`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved and implemented as the Milestone 1 build, test, and benchmark runtime
- **Decision evidence:** `package.json`; `package-lock.json`; verified `npm run check` on Node v24.14.0
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 5
- **Proposed evaluation priority:** `foundation_candidate`
- **Proposal rationale:** A supported LTS runtime provides a shared TypeScript/JavaScript deployment base for API, worker, and development tooling
- **User-decided project priority:** approved and implemented for Milestone 1
- **Priority decision date and evidence:** 2026-10-18; COC.1 implementation authorization and verified Node 24 build/test run
- **Reported license:** MIT for Node.js with separately listed bundled third-party licenses
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/nodejs/node/blob/main/LICENSE; bundled third-party notices and the selected container image require review
- **Constraints / incompatibilities:** Production must use an Active or Maintenance LTS line compatible with the selected Fastify major and target container architecture
- **Research evidence:** https://nodejs.org/en/about/previous-releases; https://github.com/nodejs/node/blob/main/README.md
- **Possible later use notes:** Node 24 LTS is pinned for Milestone 1; later production images must preserve an approved supported LTS line
- **Adoption scope:** Node 24 LTS build/test runtime and built-in test runner for Milestone 1
- **Implementation or usage references:** `package.json`; `packages/engine/test`; `packages/engine/benchmarks`; `docs/icm/current-state.md`
- **Upstream aliases / fork relationship:** no verified aliases or fork relationship recorded; unknown is not proof of absence

### postgres/postgres

- **Repository ID:** `postgres/postgres`
- **Repository URL:** https://github.com/postgres/postgres
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official documentation/license review; no compatibility test)
- **Why relevant:** Proposed transactional persistence for private projects, editable patterns, routes, and progress
- **Adoption status:** `planned`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved as the intended persistence engine; database implementation is not authorized or started
- **Decision evidence:** `docs/architecture/application-architecture.md`; COC.1 architecture approval on 2026-10-18
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 6
- **Proposed evaluation priority:** `foundation_candidate`
- **Proposal rationale:** Relational integrity, transactions, JSONB, and row-level security fit Cocolla's ownership and document metadata while remaining self-hostable
- **User-decided project priority:** approved for the future persistence milestone; not yet authorized for implementation
- **Priority decision date and evidence:** 2026-10-18; COC.1 architecture approval
- **Reported license:** PostgreSQL License
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://www.postgresql.org/about/licence/; the official GitHub repository is a mirror; exact major and container image remain unselected
- **Constraints / incompatibilities:** The 4 GB target requires conservative pools and memory settings; normalized stitch storage must pass scale benchmarks
- **Research evidence:** https://www.postgresql.org/docs/current/; https://www.postgresql.org/about/; https://github.com/postgres/postgres
- **Possible later use notes:** select a currently supported stable major and pin it before implementation/deployment
- **Adoption scope:** future transactional persistence and tenant isolation; no current installation
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** GitHub is an official mirror of the PostgreSQL source repository; contributions use PostgreSQL's upstream process

### docker/compose

- **Repository ID:** `docker/compose`
- **Repository URL:** https://github.com/docker/compose
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (official documentation/license review; no target-device test)
- **Why relevant:** Proposed single-host container definition for development parity and Synology deployment
- **Adoption status:** `planned`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved as the intended single-host deployment definition; deployment implementation is not authorized or started
- **Decision evidence:** `docs/architecture/application-architecture.md`; COC.1 architecture approval on 2026-10-18
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 7
- **Proposed evaluation priority:** `deployment_candidate`
- **Proposal rationale:** The application is a small single-host stack, and Synology lists DS923+ support for Container Manager
- **User-decided project priority:** approved for the future deployment milestone; not yet authorized for implementation
- **Priority decision date and evidence:** 2026-10-18; COC.1 architecture approval
- **Reported license:** Apache-2.0
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/docker/compose/blob/main/LICENSE; container image licenses and provenance require separate review
- **Constraints / incompatibilities:** Synology's packaged engine/Compose capabilities may lag upstream; production files must use supported syntax and pinned images
- **Research evidence:** https://docs.docker.com/compose/how-tos/production/; https://github.com/docker/compose; https://www.synology.com/en-global/dsm/packages/ContainerManager
- **Possible later use notes:** target one app container, PostgreSQL, and an optional single worker behind the DSM reverse proxy
- **Adoption scope:** future isolated staging/production on Synology Container Manager; no current installation
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** Compose Specification is maintained separately at `compose-spec/compose-spec`; Docker Compose is its reference implementation

### DefinitelyTyped/DefinitelyTyped

- **Repository ID:** `DefinitelyTyped/DefinitelyTyped`
- **Repository URL:** https://github.com/DefinitelyTyped/DefinitelyTyped
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (package metadata, repository, and license review)
- **Why relevant:** Source repository for the `@types/node`, `@types/react`, and `@types/react-dom` development dependencies used by strict TypeScript checks
- **Adoption status:** `actively_using`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** approved for Node declarations in COC.1 and React/DOM declarations in COC.2
- **Decision evidence:** `package.json`; `package-lock.json`; passing strict typecheck
- **Proposed use type:** `dependency`
- **Selected use type:** `dependency`
- **Proposed evaluation rank:** 8
- **Proposed evaluation priority:** `milestone_1_tooling`
- **Proposal rationale:** Node's built-in test and performance modules require declarations under strict TypeScript
- **User-decided project priority:** approved for COC.1 and COC.2 tooling
- **Priority decision date and evidence:** 2026-10-18; COC.1/COC.2 implementation authorization and `package-lock.json`
- **Reported license:** MIT for `@types/node`, `@types/react`, and `@types/react-dom`
- **License review status:** `documentation_reviewed`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE; installed package metadata reports MIT; pinned versions are `@types/node` 24.10.9 and React/DOM types 19.3.0
- **Constraints / incompatibilities:** Development types must track the selected Node LTS line and are not an engine runtime dependency
- **Research evidence:** https://www.npmjs.com/package/%40types/node; https://www.npmjs.com/package/%40types/react; https://www.npmjs.com/package/%40types/react-dom; https://github.com/DefinitelyTyped/DefinitelyTyped
- **Possible later use notes:** update only with a reviewed Node/toolchain upgrade
- **Adoption scope:** strict typing for Node tests/benchmarks and the React browser application
- **Implementation or usage references:** `package.json`; `package-lock.json`; `packages/engine/test`; `packages/engine/benchmarks`; `apps/web`
- **Upstream aliases / fork relationship:** package content is maintained under `DefinitelyTyped/DefinitelyTyped`; no fork relationship recorded

### makebead/craft-color-codes

- **Repository ID:** `makebead/craft-color-codes`
- **Repository URL:** https://github.com/makebead/craft-color-codes
- **Reference classification:** `candidate_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (repository, DMC source notes, and data-license review; no data imported or compatibility test)
- **Why relevant:** Candidate source for an optional DMC Six-Strand Embroidery Floss catalog with codes, names, and approximate RGB/HEX values
- **Adoption status:** `candidate`
- **Status decision date:** not decided
- **Status decision and reason:** strongest openly licensed candidate found, but not approved because upstream rights for all community-derived DMC values were not established
- **Decision evidence:** `docs/architecture/coc4-thread-catalog-plan.md`; upstream `README.md`, `SOURCES.md`, and `LICENSE-DATA.md`
- **Proposed use type:** `code_reuse`
- **Selected use type:** undecided
- **Proposed evaluation rank:** 9
- **Proposed evaluation priority:** `coc4_3_data_candidate`
- **Proposal rationale:** The repository declares its data CC BY 4.0, documents a 489-entry cross-checked DMC palette, and publishes per-palette provenance and limitations
- **User-decided project priority:** not set
- **Priority decision date and evidence:** not set
- **Reported license:** MIT for code; CC BY 4.0 for most `data/`, including the DMC compilation
- **License review status:** `documentation_reviewed_with_open_provenance_question`; checked date: 2026-10-18
- **License evidence and notes:** https://github.com/makebead/craft-color-codes/blob/main/LICENSE; https://github.com/makebead/craft-color-codes/blob/main/LICENSE-DATA.md; https://github.com/makebead/craft-color-codes/blob/main/SOURCES.md. The DMC values cite community sources including `adrianj/CrossStitchCreator`; this review did not establish redistribution rights for each upstream contribution. The compilation license is not treated as legal clearance for upstream material
- **Constraints / incompatibilities:** Approximate screen colors are not physical measurements; repository maturity and independent review are limited; CC BY attribution would be mandatory; DMC trademark and manufacturer-content terms remain separate
- **Research evidence:** https://github.com/makebead/craft-color-codes; `docs/architecture/coc4-thread-catalog-plan.md`
- **Possible later use notes:** reconsider only after the exact artifact/revision, attribution placement, upstream provenance, and legal acceptability are approved
- **Adoption scope:** none approved; no dependency or catalog data may be added from this entry
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** no verified alias or fork relationship; its DMC palette documents a lineage from several third-party sources

### Rejected community DMC catalog sources

- **Repository IDs:** `sharlagelfand/dmc`; `adrianj/CrossStitchCreator`; `seanockert/rgb-to-dmc`; `zilliah/embroidery-floss-api`
- **Repository URLs:** https://github.com/sharlagelfand/dmc; https://github.com/adrianj/CrossStitchCreator; https://github.com/seanockert/rgb-to-dmc; https://github.com/zilliah/embroidery-floss-api
- **Reference classification:** `candidate_reference`
- **Added:** 2026-10-18
- **Last reviewed:** 2026-10-18 (repository/readme/license/data-provenance review; no data imported or code executed)
- **Why relevant:** Public DMC code/name/RGB datasets and matching examples considered during COC.4.3 source research
- **Adoption status:** `rejected`
- **Status decision date:** 2026-10-18
- **Status decision and reason:** rejected as catalog reuse sources because a sufficiently clear, complete redistribution and data-provenance chain was not established; some are incomplete or outdated
- **Decision evidence:** `docs/architecture/coc4-thread-catalog-plan.md`; repository README, license, and data-generation files reviewed there
- **Proposed use type:** `code_reuse`
- **Selected use type:** none
- **Proposed evaluation rank:** not ranked after rejection
- **Proposed evaluation priority:** `rejected_data_source`
- **Proposal rationale:** evaluated only to locate a redistributable DMC catalog and understand common RGB-data lineage
- **User-decided project priority:** not set
- **Priority decision date and evidence:** not set
- **Reported license:** `sharlagelfand/dmc` package code is MIT; no usable separate dataset license was established for its `adrianj`-derived data. No repository license was found during review for the other three sources
- **License review status:** `rejected_insufficient_data_rights`; checked date: 2026-10-18
- **License evidence and notes:** `sharlagelfand/dmc/data-raw/floss.R` identifies `adrianj/CrossStitchCreator` as its source and records manual trial-and-error corrections. `seanockert/rgb-to-dmc` cites third-party web charts. `zilliah/embroidery-floss-api` describes only a basic subset. Absence of a detected license is not proof of ownership or permission
- **Constraints / incompatibilities:** unclear upstream origin/rights, incomplete or older color ranges, approximate/unmeasured RGB values, and insufficient update/version metadata
- **Research evidence:** repository URLs above; `docs/architecture/coc4-thread-catalog-plan.md`
- **Possible later use notes:** do not reconsider unless a source supplies materially new license and provenance evidence addressing this rejection
- **Adoption scope:** none
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** `sharlagelfand/dmc` explicitly derives its data from `adrianj/CrossStitchCreator`; other lineage claims remain as documented in their own repositories

### chenglou/pretext

- **Repository ID:** `chenglou/pretext`
- **Repository URL:** https://github.com/chenglou/pretext
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-28
- **Last reviewed:** 2026-10-28 (official README and root license; no browser/runtime performance tests)
- **Why relevant:** Optional Canvas text measurement for labels, annotations and help/legend overlays around stitch/grid editing.
- **Adoption status:** `candidate`
- **Status decision date:** not decided
- **Status decision and reason:** retained as an approved reference only; no installation or implementation authorized
- **Decision evidence:** no project adoption decision recorded
- **Proposed use type:** `inspiration`
- **Selected use type:** undecided
- **Proposed evaluation rank:** 10
- **Proposed evaluation priority:** `future_reference`
- **Proposal rationale:** Defer behind stitch rendering, image import, selection and thread workflows; use native Canvas measurement unless complex multiline layout proves necessary.
- **User-decided project priority:** P3 · Low · reference priority approved 2026-10-28 (not an adoption or schedule decision)
- **Priority decision date and evidence:** 2026-10-28; user approval in ChatGPT; no public decision URL
- **Reported license:** MIT, with bundled Chromium/WebKit-origin notices requiring preservation
- **License review status:** `documentation_reviewed`; checked date: 2026-10-28
- **License evidence and notes:** https://github.com/chenglou/pretext/blob/main/LICENSE. Root license inspected; upstream/third-party notices must be retained; dependencies and future versions require review
- **Constraints / incompatibilities:** Pretext does not map pixels to stitches or improve embroidery color quantization, symbol placement semantics, database persistence or export. No architecture or dependency choice follows from this reference.
- **Research evidence:** https://github.com/chenglou/pretext/blob/main/README.md; https://github.com/chenglou/pretext/blob/main/LICENSE
- **Possible later use notes:** Possible later label-layout inspiration only; not a stitch engine or approved dependency.
- **Adoption scope:** none approved
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** canonical `chenglou/pretext`; no verified aliases or fork relationship recorded

### google/elephant-goldfish-model

- **Repository ID:** `google/elephant-goldfish-model`
- **Repository URL:** https://github.com/google/elephant-goldfish-model
- **Reference classification:** `accepted_reference`
- **Added:** 2026-10-28
- **Last reviewed:** 2026-10-28 (pinned official README, docs/harnesses, privacy, and LICENSE; no workflow execution)
- **Why relevant:** Independent critiques of image-to-stitch conversion, color quantization, edit history, document import and data/persistence design proposals.
- **Adoption status:** `candidate`
- **Status decision date:** not decided
- **Status decision and reason:** Reference retained for future evaluation, not an implementation or installation decision
- **Decision evidence:** user approved RepoInspire reference retention on 2026-10-28; no public adoption evidence
- **Proposed use type:** `inspiration`
- **Selected use type:** undecided
- **Proposed evaluation rank:** 11
- **Proposed evaluation priority:** `future_reference`
- **Proposal rationale:** Apply only to complex engine/data decisions; prioritize verified stitch features and protected-detail image-import tests over new process tooling.
- **User-decided project priority:** not set; P2 · Medium (secondary proposal)
- **Priority decision date and evidence:** not set; secondary-app priority is a research proposal
- **Reported license:** Apache-2.0
- **License review status:** `documentation_reviewed`; checked date: 2026-10-28
- **License evidence and notes:** https://github.com/google/elephant-goldfish-model/blob/f0ba151b252c9abf1318d9fe857a43265d06de89/LICENSE. Root license and public docs inspected; not a legal or compatibility sign-off
- **Constraints / incompatibilities:** Do not modify the Canvas editor, stitch/color semantics, image data or backend plans. No package installation or provider data disclosure approved. EGM's `egm-review` requires independent fresh-context subagents; without them it stops. The host account/model handles data, permissions and retention; EGM is not a separate privacy/security boundary. Read entire plugin and companion personas; skill-only copying breaks it.
- **Research evidence:** https://github.com/google/elephant-goldfish-model/blob/f0ba151b252c9abf1318d9fe857a43265d06de89/README.md; https://github.com/google/elephant-goldfish-model/blob/f0ba151b252c9abf1318d9fe857a43265d06de89/docs/harnesses.md; https://github.com/google/elephant-goldfish-model/blob/f0ba151b252c9abf1318d9fe857a43265d06de89/docs/privacy.md
- **Possible later use notes:** Design specification reviews, selective `egm-review`/`egm-drift-report` comparison, with existing project ICM/ADR and QA gates maintained.
- **Adoption scope:** none approved; no installation or changes to coding-agent configuration
- **Implementation or usage references:** none recorded
- **Upstream aliases / fork relationship:** canonical `google/elephant-goldfish-model`; no aliases verified, and upstream metadata identifies a non-fork repository

## Decision history

- 2026-10-28 — `google/elephant-goldfish-model`: approved as an `accepted_reference` for RepoInspire; secondary project application proposed, without user-selected project priority. Proposed rank 11 appended; existing rankings and adoption decisions unchanged. No plugins, packages, hooks or runtime changes approved.
- 2026-10-28 — `chenglou/pretext`: user approved retention as `accepted_reference` with P3 · Low reference priority. Proposed evaluation rank 10 appended, preserving earlier rankings. Remains `candidate`: no selected use, dependency, implementation, or roadmap commitment.
- 2026-10-18 — `storytold/artcraft`: carried into this register as `candidate_reference`. Retained for future exploration; no install or implementation decision. Proposed rank 1 is an assistant assessment; user-decided priority and selected use remain unset
- 2026-10-18 — `facebook/react`, `microsoft/TypeScript`, `fastify/fastify`, `nodejs/node`, `postgres/postgres`, and `docker/compose`: entered bounded COC.1 architecture evaluation. All remain unapproved candidates; no installation, selected version, or implementation use is authorized
- 2026-10-18 — COC.1 architecture approved: React, Fastify, PostgreSQL, and Compose moved to `planned`; TypeScript 5.9.3 and Node 24 LTS moved to `actively_using` with Milestone 1 evidence
- 2026-10-18 — `DefinitelyTyped/DefinitelyTyped`: accepted and marked `actively_using` for `@types/node` 24.10.9 in Milestone 1 tooling; no engine runtime dependency added
- 2026-10-18 — COC.2 authorized and implemented React 19.3.1, React DOM 19.3.1, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, and React/DOM type declarations. React moved from `planned` to `actively_using`; the Vite repositories were accepted as `actively_using` with build and browser evidence
- 2026-10-18 — COC.4.3 source research retained `makebead/craft-color-codes` as a catalog-data candidate only, pending upstream-rights and attribution approval. `sharlagelfand/dmc`, `adrianj/CrossStitchCreator`, `seanockert/rgb-to-dmc`, and `zilliah/embroidery-floss-api` were rejected as reusable catalog sources because clear, complete data provenance and redistribution rights were not established. No dependency or catalog data was adopted
- 2026-10-18 — COC.4.3 Stage 1 implemented a dependency-free catalog/matcher foundation and an invented Cocolla synthetic fixture. No external catalog repository, DMC data, or new dependency was adopted, so the candidate and rejection statuses above remain unchanged

## Maintenance and identity

Compare normalized lowercase `owner/repo` keys; retain the canonical URL/casing. Verify a rename/transfer before adding an alias in the master. Keep forks distinct with explicit upstream evidence. Preserve all rejection/retirement reasons when consolidating identities.

Project-local decisions are canonical. Master projections require the source project-file URL, revision and observation date. Missing/stale/conflicting sources stay explicit; never replace newer local decisions with an older projection. There is no automatic installation or bidirectional synchronization.
