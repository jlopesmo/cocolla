# Cocolla repository inspiration register

<!-- catalog-schema-version: 1; project-template: templates/repoinspire.md -->
**Project:** [jlopesmo/cocolla](https://github.com/jlopesmo/cocolla)  
**Project ID:** `cocolla`  
**Master catalog:** [jlopesmo/repoinspire](https://github.com/jlopesmo/repoinspire)  
**Last register review:** 2026-10-18

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

## Decision history

- 2026-10-18 — `storytold/artcraft`: carried into this register as `candidate_reference`. Retained for future exploration; no install or implementation decision. Proposed rank 1 is an assistant assessment; user-decided priority and selected use remain unset
- 2026-10-18 — `facebook/react`, `microsoft/TypeScript`, `fastify/fastify`, `nodejs/node`, `postgres/postgres`, and `docker/compose`: entered bounded COC.1 architecture evaluation. All remain unapproved candidates; no installation, selected version, or implementation use is authorized
- 2026-10-18 — COC.1 architecture approved: React, Fastify, PostgreSQL, and Compose moved to `planned`; TypeScript 5.9.3 and Node 24 LTS moved to `actively_using` with Milestone 1 evidence
- 2026-10-18 — `DefinitelyTyped/DefinitelyTyped`: accepted and marked `actively_using` for `@types/node` 24.10.9 in Milestone 1 tooling; no engine runtime dependency added
- 2026-10-18 — COC.2 authorized and implemented React 19.3.1, React DOM 19.3.1, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, and React/DOM type declarations. React moved from `planned` to `actively_using`; the Vite repositories were accepted as `actively_using` with build and browser evidence

## Maintenance and identity

Compare normalized lowercase `owner/repo` keys; retain the canonical URL/casing. Verify a rename/transfer before adding an alias in the master. Keep forks distinct with explicit upstream evidence. Preserve all rejection/retirement reasons when consolidating identities.

Project-local decisions are canonical. Master projections require the source project-file URL, revision and observation date. Missing/stale/conflicting sources stay explicit; never replace newer local decisions with an older projection. There is no automatic installation or bidirectional synchronization.
