# COC.3 private-persistence implementation breakdown

**Status:** Proposed execution breakdown; implementation is not authorized
**Prepared:** 2026-10-18

COC.3 should deliver one owner-isolated persistence path without expanding into sharing, real-time collaboration, background imports, or production deployment. Exact Fastify, PostgreSQL image, database client/migration, password-hashing, and session-support versions remain selection gates. Adopt them only after review and update `repoinspire.md` when those dependency decisions change.

## 1. Isolated local database foundation

- Add a development-only Compose definition with PostgreSQL bound to loopback or an internal network, a dedicated named volume, health check, and development credentials outside tracked files.
- Use separate migration-owner and constrained application roles. Add repeatable bootstrap, migrate, status, and test-database commands that cannot target staging or production implicitly.
- Exit when a clean Windows checkout can start, migrate, test, stop, and recreate only its isolated Cocolla development database.

## 2. Schema, ownership, and revision migrations

- Create users, sessions, projects, patterns, layers, colors, normalized stitch elements, change sets, and checkpoints according to the approved model.
- Give every private resource an unambiguous owner path. Add foreign keys, uniqueness constraints, safe revision fields, and indexes for owner lists and pattern viewport access.
- Enable and force RLS on user-owned tables. The application role must be non-owner, non-superuser, and unable to bypass RLS.
- Exit when migrations work both forward from empty and against a restored fixture, and direct SQL tests prove cross-user rows are invisible to the application role.

## 3. Fastify application boundary

- Add `apps/api` as a modular monolith with typed configuration, lifecycle-managed database pool, health/readiness endpoints, structured errors, bounded payloads, and graceful shutdown.
- Keep handlers thin: authentication and authorization establish request context; repository/application services own transactions; the existing engine validates documents and commands.
- Serve the SPA and versioned API from one origin in deployment while retaining independent local development processes.
- Exit when API contract tests run against the isolated test database without importing React or coupling the engine to Fastify.

## 4. Authentication and server-side sessions

- Implement local accounts with a reviewed password-hashing choice, normalized unique login identity, generic failure responses, rate limits, and password policy.
- Store revocable, expiring sessions server-side. Send only an opaque identifier in `HttpOnly`, `SameSite`, appropriately `Secure` cookies; address CSRF for every state-changing route.
- Rotate sessions on authentication, support logout/revocation, and avoid logging credentials, cookies, password material, or private pattern bodies.
- Exit when login, logout, expiry, rotation, fixation resistance, and unauthenticated-route tests pass.

## 5. Private projects and pattern persistence

- Add owner-scoped project create/list/read/update/delete operations and pattern create/load operations.
- Persist versioned pattern state through a repository adapter rather than exposing tables to handlers. Preserve the UI/database-independent document contract.
- Submit edits as engine command batches with `base_revision`; in one transaction verify ownership, lock/check the current revision, apply engine commands, persist element/change-set updates, increment once, and return explicit conflicts.
- Keep JSON import/export available as a user-controlled portability path.
- Exit when create, reload, edit, rotate, conflict, and deterministic document round trips pass through the API and database.

## 6. Isolation and failure-path test gate

- Use at least two users and test list, guessed/direct IDs, mutations, deletes, command batches, checkpoints, and session boundaries.
- Exercise both API authorization and direct repository/database paths so forced RLS is verified as defense in depth.
- Test rollback on invalid documents, unsupported commands, revision conflicts, and partial batch failures.
- Treat any cross-user observation or mutation as a release blocker.

## 7. Web persistence integration

- Introduce a web repository/client boundary that loads private projects and sends revisioned command batches. Keep editor state and rendering independent of transport.
- Replace the local-only status with explicit saving/saved/conflict/offline states. Do not discard local history on a conflict; provide a safe reload/export recovery path.
- Exit when a user can sign in, create a private project, edit/rotate a pattern, reload it, and cannot access another user's data.

## 8. Environment separation and Synology preparation

- Keep development, staging, and production Compose configuration, secrets, networks, volumes, hostnames, and backup targets distinct. Never reuse the local database or credentials.
- For future Synology staging/production, use pinned images, conservative memory/connection limits, a non-root app container, internal-only PostgreSQL, DSM reverse-proxy TLS, health checks, bounded logs, and coordinated database/asset backups.
- Run restore drills and target-device soak tests before production approval. Staging and production deployment remain separately authorized operations.

## Recommended COC.3 delivery slices

1. Development database, roles, migration harness, and schema/RLS tests.
2. Fastify skeleton plus authentication/session lifecycle.
3. Owner-scoped project and read-only pattern load path.
4. Transactional revisioned pattern commands and conflict behavior.
5. Web sign-in/project persistence integration and full two-user isolation suite.
6. Deployment artifacts and Synology staging readiness review, without production release.
