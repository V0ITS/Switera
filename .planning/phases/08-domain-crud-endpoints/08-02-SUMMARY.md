---
phase: 08-domain-crud-endpoints
plan: 02
subsystem: api
tags: [express, prisma, zod, rbac, kota, stok]

# Dependency graph
requires:
  - phase: 08-domain-crud-endpoints
    plan: 01
    provides: validate(schema) Zod middleware, errorHandler, stokService.js, CORS lock
provides:
  - kotaService.tambahKota({ nama, kapasitas }) — closes the Phase 6 "create city" gap
  - kotaSchemas.js (kotaCreateSchema, kotaUpdateSchema) and stokSchemas.js (stokUpdateSchema)
  - GET/POST/PUT/DELETE /kota + GET /kota/:nama/references (RBAC + Zod guarded)
  - GET/PUT /stok-tbs (RBAC + Zod guarded)
  - kotaRoutes.verify.mjs — reusable end-to-end RBAC/validation/round-trip verify script
affects: [08-03, 08-04, 08-05, 08-06, 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route handler shape: async (req, res, next) => { try { ...await service call...; res.status(...).json(...); } catch (error) { next(error); } } — handlers never format errors inline, errorHandler owns that"
    - "Reads (GET) require only requireAuth; writes (POST/PUT/DELETE) require requireAuth + requireRole(\"Admin\") + validate(schema) in that order — the copy-paste RBAC contract from Phase 7 extended with Zod"
    - "Verify scripts assert RBAC 403s, Zod 400 field errors, and self-clean create/update round-trips so they are safely re-runnable against the seeded dev DB"

key-files:
  created:
    - server/src/schemas/kotaSchemas.js
    - server/src/schemas/stokSchemas.js
    - server/src/routes/kotaRoutes.js
    - server/src/routes/stokRoutes.js
    - server/src/routes/kotaRoutes.verify.mjs
  modified:
    - server/src/services/kotaService.js
    - server/src/index.js

key-decisions:
  - "tambahKota mirrors src/store.js's tambahKota exactly: trims the name, throws the identical duplicate-name error, coerces kapasitas via Number(kapasitas) || 0 at the service layer (Zod already guarantees a non-negative integer arrives, this is defense in depth matching frontend parity)"
  - "kota reads (GET /, GET /:nama/references) are requireAuth-only, not Admin-gated — every role's pages consume the city list/reference counts, and the plan's RBAC rationale (src/utils/navigation.js: Manajemen Kota is Admin-only for writes, not reads) is followed exactly"
  - "stok body field name is { stokTbs } (not a bare value) to keep the JSON body self-describing and consistent with the GET response shape { stokTbs }"
  - "kapasitas/stokTbs schemas use z.coerce.number() so numeric strings from form-style bodies validate, then .int().nonnegative() rejects floats and negatives with Indonesian field messages"

requirements-completed: [API-01, API-02, AUTH-03]

# Metrics
duration: 9min
completed: 2026-06-24
status: complete
---

# Phase 8 Plan 2: Kota and Stok Domain Routers Summary

**REST endpoints for the Kota and Stok domains — GET/POST/PUT/DELETE /kota and GET/PUT /stok-tbs, all RBAC-guarded (Admin-only writes) and Zod-validated (400 field errors), closing the Phase 6 "no tambahKota" gap and giving Wave 2/3 a proven router template.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-24T19:20:00Z
- **Completed:** 2026-06-24T19:29:12Z
- **Tasks:** 2 completed
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- `kotaService.tambahKota({ nama, kapasitas })` added, matching `src/store.js`'s `tambahKota` exactly (trim, duplicate-name guard with the identical Indonesian error message, `Number(kapasitas) || 0` coercion), completing the kota service layer alongside the existing `getDaftarKota`/`getKotaReferenceCounts`/`updateKota`/`hapusKota`
- `kotaSchemas.js` (`kotaCreateSchema`, `kotaUpdateSchema`) and `stokSchemas.js` (`stokUpdateSchema`) — Zod schemas with Indonesian field messages, coercing numeric strings and rejecting negative/non-integer values; serve as the mass-assignment allowlist (T-08-K-MASS)
- `kotaRoutes.js`: `GET /` and `GET /:nama/references` open to any authenticated role; `POST /`, `PUT /:nama`, `DELETE /:nama` require `requireAuth` + `requireRole("Admin")`, with `validate(...)` guarding the two write bodies
- `stokRoutes.js`: `GET /` open to any authenticated role; `PUT /` requires `requireAuth` + `requireRole("Admin")` + `validate(stokUpdateSchema)`
- Both routers mounted in `index.js` (`/kota`, `/stok-tbs`) above the "keep last" `errorHandler` line; existing `/health`, `/auth`, `/protected` routes confirmed unaffected
- `kotaRoutes.verify.mjs` — idempotent end-to-end script: logs in as admin/logistik, asserts `GET /kota` 200, `POST /kota` as logistik 403, `POST /kota` with empty `nama` 400 with `fields.nama`, create-then-delete round-trip for a throwaway city, `PUT /stok-tbs` as logistik 403, and an update-then-restore round-trip for the stok value. Ran twice consecutively with identical `KOTA_ROUTES_OK true` / `STOK_ROUTES_OK true` output and exit code 0 both times, confirming idempotency.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tambahKota to kotaService + Zod schemas for kota and stok** - `4103e38` (feat)
2. **Task 2: Kota and Stok routers with RBAC + Zod, mounted in the app** - `6192806` (feat)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); SUMMARY.md/STATE.md are written to disk only, batch-committed once after Phase 10.

## Files Created/Modified

- `server/src/services/kotaService.js` - Added `tambahKota({ nama, kapasitas })`
- `server/src/schemas/kotaSchemas.js` - `kotaCreateSchema`, `kotaUpdateSchema`
- `server/src/schemas/stokSchemas.js` - `stokUpdateSchema`
- `server/src/routes/kotaRoutes.js` - Express router: GET/POST/PUT/DELETE `/kota` + GET `/kota/:nama/references`
- `server/src/routes/stokRoutes.js` - Express router: GET/PUT `/stok-tbs`
- `server/src/routes/kotaRoutes.verify.mjs` - Standalone idempotent verify script
- `server/src/index.js` - Imported and mounted `kotaRouter`/`stokRouter` above the error handler

## Decisions Made

- `tambahKota` placed alongside the existing Phase 6 kota service functions, matching their style exactly (no Express imports, plain async functions, Prisma calls, return `getDaftarKota()` at the end) — confirmed via `acceptance_criteria` check (`no express imports in kotaService.js`)
- Stok PUT body field name kept as `{ stokTbs }` rather than a bare scalar value, so the request/response shapes are symmetric and self-describing
- Reads vs. writes RBAC split exactly as the plan specified: `requireAuth` only on `GET /kota`, `GET /kota/:nama/references`, `GET /stok-tbs`; `requireAuth` + `requireRole("Admin")` on every write

## Deviations from Plan

None - plan executed exactly as written. No auto-fixes, no architectural changes, no scope creep beyond the two tasks specified.

## Issues Encountered

None. Both tasks' automated verify commands passed on the first run; `kotaRoutes.verify.mjs` was additionally run a second time to confirm idempotency (both runs reported all `*_OK true` lines and exit code 0).

## User Setup Required

None - Docker Desktop / `switera-db-1` (Postgres 16) was already running and seeded from prior phases; this plan added no migration, no new env var, no new dependency (zod was already present in `server/package.json` from a prior phase).

## Next Phase Readiness

- The Kota/Stok router pair (this plan) is the proven template for the remaining Wave 2/3 domain routers (08-03 through 08-06): `requireAuth`/`requireRole`/`validate(schema)` composition, async handlers forwarding errors via `next(err)`, and a self-cleaning `*.verify.mjs` script per router
- `errorHandler` remains mounted last in `index.js`; the "keep last" comment is still accurate and the next plan's routers must mount above it the same way `kotaRouter`/`stokRouter` did
- No blockers carried forward. `npx prisma migrate status` confirms no schema drift (this plan added no migration, as expected — kota/stok tables already existed from Phase 6/08-01)

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-24*

## Self-Check: PASSED

All created files confirmed on disk: server/src/schemas/kotaSchemas.js, server/src/schemas/stokSchemas.js, server/src/routes/kotaRoutes.js, server/src/routes/stokRoutes.js, server/src/routes/kotaRoutes.verify.mjs.
All task commits confirmed in git log: 4103e38, 6192806.
