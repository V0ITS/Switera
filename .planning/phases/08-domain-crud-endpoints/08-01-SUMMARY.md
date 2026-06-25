---
phase: 08-domain-crud-endpoints
plan: 01
subsystem: api
tags: [express, prisma, zod, cors, error-handling, postgres]

# Dependency graph
requires:
  - phase: 07-auth-authorization
    provides: requireAuth/requireRole middleware contract, JWT helper, akunService bcrypt login/register
provides:
  - Stok singleton Prisma model + migration, closing the Phase 6 "stokTbs unmodeled" gap
  - stokService.js (getStokTbs/setStokTbs) backed by PostgreSQL
  - validate(schema) Zod middleware factory: 400 + field-level errors, allowlists req.body
  - errorHandler(err, req, res, next) central Express error handler (statusCode-aware, message-matching fallback, no stack leak)
  - CORS locked to http://localhost:5173 (CORS_ORIGIN env override), credentials: true
affects: [08-02, 08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "validate(schema) Express middleware factory using Zod safeParse, replacing req.body with parsed/allowlisted data"
    - "errorHandler central 4-arg Express error middleware mounted last, with err.statusCode as the preferred convention over message matching"
    - "Stok singleton row pattern: fixed @id default('singleton'), upsert-based read/write, mirrors store.js's getX/setX naming"

key-files:
  created:
    - server/src/services/stokService.js
    - server/src/middleware/validate.js
    - server/src/middleware/errorHandler.js
    - server/prisma/migrations/20260624191913_add_stok_singleton/migration.sql
  modified:
    - server/prisma/schema.prisma
    - server/prisma/seed.js
    - server/src/index.js

key-decisions:
  - "Stok modeled as a fixed-id singleton row (id String @id @default(\"singleton\"), stokTbs Int) rather than a config table, matching the plan's spec exactly"
  - "errorHandler prefers err.statusCode when present, falls back to Indonesian message-matching (sudah ada/sudah digunakan/tidak bisa dihapus -> 409, tidak ditemukan -> 404) for Phase 6/7 errors that pre-date the statusCode convention"
  - "CORS uses a static allow-listed origin string (not origin: true reflective), with CORS_ORIGIN env override for non-hardcoded configurability"
  - "Fixed a latent bug in index.js's run-directly check (process.argv[1] undefined under node -e import-only invocations threw ERR_INVALID_ARG_TYPE) — guarded with a truthiness check before calling pathToFileURL"

patterns-established:
  - "Pattern: validate(schema) middleware mounted per-route ahead of handlers; handlers must spread only req.body (the validated DTO) into Prisma, never blind ...req.body — Wave 2/3 mass-assignment defense (T-08-MASSASSIGN)"
  - "Pattern: errorHandler mounted as the final app.use; all domain routers (Wave 2/3) mount ABOVE the 'keep last' comment line"

requirements-completed: [API-02, API-03, API-01]

# Metrics
duration: 22min
completed: 2026-06-24
status: complete
---

# Phase 8 Plan 1: Backend Cross-Cutting Infrastructure Summary

**Stok singleton Prisma model + service, reusable Zod validate() middleware with field-level 400s, central errorHandler with statusCode/message-mapping, and CORS locked to the Vite dev origin — the shared primitives every Wave 2/3 domain router depends on.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-24T19:01:00Z
- **Completed:** 2026-06-24T19:23:38Z
- **Tasks:** 3 completed
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- `Stok` singleton model added to schema.prisma, migrated, and seeded (stokTbs=150, idempotent upsert) — closes the Phase 6 "stokTbs left unmodeled" gap; `stokService.js` provides `getStokTbs`/`setStokTbs` round-tripping through PostgreSQL
- `validate(schema)` Zod middleware factory: returns 400 + `{ error, fields: { path: message } }` on invalid body, replaces `req.body` with the parsed/allowlisted DTO on success (mass-assignment defense)
- `errorHandler(err, req, res, next)` central error handler: honors `err.statusCode` first, falls back to Indonesian message-matching for pre-existing Phase 6/7 errors, never leaks `err.stack`/raw message on the generic 500 path
- CORS tightened from wide-open `cors()` to `{ origin: "http://localhost:5173" (or CORS_ORIGIN env), credentials: true }`; `errorHandler` wired in as the final `app.use`, positioned after `/auth` and `/protected` with a "keep last" comment for Wave 2/3 routers

## Task Commits

Each task was committed atomically:

1. **Task 1: Stok singleton model, migration, and stokService** - `145c883` (feat)
2. **Task 2: Zod validation middleware + central error handler** - `8bd2552` (feat)
3. **Task 3: Lock CORS to the Vite dev origin and wire the error handler into the app** - `d35f795` (feat)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); SUMMARY.md/STATE.md are written to disk only, batch-committed once after Phase 10.

_Note: No TDD tasks in this plan; all three are single `feat` commits._

## Files Created/Modified
- `server/prisma/schema.prisma` - Added `model Stok` (singleton id, stokTbs Int)
- `server/prisma/migrations/20260624191913_add_stok_singleton/migration.sql` - Migration creating the Stok table
- `server/prisma/seed.js` - Added `seedStok()` (upserts stokTbs=150), called from `main()` after `seedKota()`
- `server/src/services/stokService.js` - `getStokTbs()`/`setStokTbs(value)`, mirrors `src/store.js` semantics exactly (Number(value) || 0 coercion, defensive 0 fallback)
- `server/src/middleware/validate.js` - `validate(schema)` factory middleware
- `server/src/middleware/errorHandler.js` - Central 4-arg error handler
- `server/src/index.js` - CORS lock, errorHandler mount, fixed run-directly argv guard

## Decisions Made
- Stok modeled as a fixed-id singleton row rather than a generic key-value settings table — simplest shape that satisfies both the stok endpoints (API-01) and the future ranking engine (LOGIC-01, 08-04) needs
- `errorHandler` treats `err.statusCode` as the primary signal (documented convention for Wave 2/3 services going forward), keeping message-matching only as a compatibility fallback for the three Phase 6/7 error strings that already exist
- CORS origin is a static allow-listed string read from `CORS_ORIGIN` env (default `http://localhost:5173`), not `origin: true` — avoids the reflective-origin anti-pattern flagged in the threat model (T-08-CORS)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed index.js run-directly check crashing under verify-script invocation**
- **Found during:** Task 3 (running the plan's own automated verify command)
- **Issue:** `if (import.meta.url === pathToFileURL(process.argv[1]).href)` throws `ERR_INVALID_ARG_TYPE` when `process.argv[1]` is `undefined` — which is exactly the case for `node -e "import('./src/index.js')..."` (no script-file argument). This is a latent bug introduced in Phase 7 (07-01) that was never triggered before because all prior verify scripts ran as real `.mjs` files (where `argv[1]` is always defined). Task 3's own plan-specified verify command was the first invocation style to expose it, blocking verification entirely.
- **Fix:** Added a truthiness guard: `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`. Dynamic-import-only invocations now simply skip auto-listen (same behavior as any other `import`), instead of throwing.
- **Files modified:** server/src/index.js
- **Verification:** Re-ran Task 3's verify command (`CORS_OK`) and confirmed `node src/index.js` direct-run still auto-listens and `/health` returns 200 via curl.
- **Committed in:** d35f795 (Task 3 commit)

**2. [Operational - not a plan deviation] Killed a stray leftover `node src/index.js` process holding a Windows file lock**
- **Found during:** Task 1 (`npx prisma migrate dev`)
- **Issue:** `prisma generate`'s client-regeneration step failed with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp...` — a stray Node process (PID 76912, `node src/index.js`) left running from an earlier session held the Prisma query-engine DLL open, a Windows-specific file-lock issue (no `git clean`/destructive operation involved).
- **Fix:** Identified the process via `Get-Process`, confirmed it was an orphaned `node src/index.js` instance (not user's active dev server), terminated it with `Stop-Process -Force`, then re-ran `npx prisma generate` successfully.
- **Files modified:** None (no code change; environment cleanup only)
- **Verification:** `npx prisma generate` succeeded; `npx prisma migrate status` reports "Database schema is up to date!"

---

**Total deviations:** 2 (1 auto-fixed code bug, 1 environment cleanup)
**Impact on plan:** Both necessary to complete Task 1/3 verification as specified. No scope creep — no new files beyond what the plan listed, no architectural changes.

## Issues Encountered
None beyond the two deviations documented above (both resolved inline, no open issues remain).

## User Setup Required

None - no external service configuration required. Docker Desktop / `switera-db-1` container was already running and seeded per Phase 6/7; this plan only adds a migration and a seed function on top of the existing setup.

## Next Phase Readiness

- `validate(schema)` and `errorHandler` are ready to be imported by every Wave 2/3 domain router (08-02 through 08-06) — `validate` guards mutating routes, `errorHandler` is already mounted last in `index.js` with a "keep last" comment marking where new routers must mount above it
- `stokService.getStokTbs`/`setStokTbs` is ready for the stok endpoints (API-01, likely 08-02/08-03) and the ranking engine (LOGIC-01, 08-04)
- CORS is locked to the Vite dev origin; the frontend (Phase 9, frontend integration) will be able to call the API from the browser with no CORS error in devtools, as long as it runs on `http://localhost:5173`
- No blockers carried forward from this plan. The `/protected` throwaway router from Phase 7 remains mounted (08-06 owns its removal per plan instruction) and sits before the new `errorHandler` mount, satisfying the "errorHandler after all current routers" requirement

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-24*

## Self-Check: PASSED

All created files confirmed on disk: server/src/services/stokService.js, server/src/middleware/validate.js, server/src/middleware/errorHandler.js, server/prisma/migrations/20260624191913_add_stok_singleton/migration.sql, .planning/phases/08-domain-crud-endpoints/08-01-SUMMARY.md.
All task commits confirmed in git log: 145c883, 8bd2552, d35f795.
