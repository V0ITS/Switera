---
phase: 08-domain-crud-endpoints
plan: 03
subsystem: api
tags: [express, prisma, zod, rbac, permintaan]

# Dependency graph
requires:
  - phase: 08-domain-crud-endpoints
    plan: 01
    provides: validate(schema) Zod middleware, errorHandler, CORS lock
provides:
  - permintaanService.js (getPermintaan, hasPermintaanDuplikat, addPermintaan, updatePermintaan, removePermintaan) — Prisma-backed, store.js snake_case shape preserved via toApi/toDb mappers
  - permintaanSchemas.js (permintaanCreateSchema, permintaanUpdateSchema)
  - GET/POST/PUT/DELETE /permintaan + GET /permintaan/duplikat (RBAC + Zod guarded)
  - permintaanRoutes.verify.mjs — RBAC/validation/duplicate-check/CRUD round-trip verify script
affects: [08-04, 08-05, 08-06, 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toApi(row)/toDb(entry) private mapper pair at the top of a service file translates between the store.js snake_case API contract and Prisma's camelCase columns — toDb only includes keys present via hasOwnProperty checks, so partial updates (PUT) merge correctly instead of overwriting untouched fields with undefined"
    - "Pre-check existence before update/delete and throw Object.assign(new Error(msg), { statusCode: 404 }) for a clean 404, rather than letting Prisma's raw P2025 'record not found' error reach errorHandler's generic 500 fallback"

key-files:
  created:
    - server/src/services/permintaanService.js
    - server/src/schemas/permintaanSchemas.js
    - server/src/routes/permintaanRoutes.js
    - server/src/routes/permintaanRoutes.verify.mjs
  modified:
    - server/src/index.js

key-decisions:
  - "addPermintaan/updatePermintaan/removePermintaan are pure CRUD only in this plan — store.js's addPermintaan also pushes a notification + anomaly notification + activity-log entry (LOGIC-03), explicitly deferred to 08-05 which will extend this service's mutations rather than duplicate logic here"
  - "GET /permintaan and GET /permintaan/duplikat are requireAuth-only (no role gate) — every role's dashboards and the ranking engine (08-05) read permintaan data downstream; only POST/PUT/DELETE are requireRole(\"Admin\")-gated, mirroring src/utils/navigation.js placing 'Input Data'/'Manajemen Data' in the Admin menu only"
  - "GET /permintaan/duplikat maps the tanggal_permintaan query param to hasPermintaanDuplikat's tanggalPermintaan arg key explicitly in the route handler — preserves store.js's inconsistent naming (row field is snake_case, the function's destructured arg is camelCase) without leaking that inconsistency into the query-string contract"
  - "updatePermintaan/removePermintaan pre-check row existence with prisma.findUnique before the mutating call and throw a statusCode:404-tagged error, instead of relying solely on Prisma's update/delete throwing P2025 — keeps the 404 path explicit and matches the errorHandler statusCode convention from 08-01"

requirements-completed: [API-01, API-02, AUTH-03]

# Metrics
duration: 35min
completed: 2026-06-24
status: complete
---

# Phase 8 Plan 3: Permintaan Domain Router Summary

**REST endpoints for the Permintaan (request) domain — GET/POST/PUT/DELETE /permintaan + GET /permintaan/duplikat, all RBAC-guarded (Admin-only writes) and Zod-validated (400 field errors, including a hard server-side reject on non-positive jumlah_permintaan), preserving the exact src/store.js snake_case shape via a toApi/toDb mapper pair so Phase 9's store-as-seam swap is mechanical.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-06-24
- **Tasks:** 2 completed
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `permintaanService.js`: `getPermintaan`, `hasPermintaanDuplikat`, `addPermintaan`, `updatePermintaan`, `removePermintaan` — all ported from `src/store.js`, with `toApi(row)`/`toDb(entry)` private mappers translating Prisma's camelCase (`kotaNama`, `tanggalPermintaan`, `tanggalInput`, `jumlahPermintaan`) to/from the store.js snake_case API contract (`kota`, `tanggal_permintaan`, `tanggal_input`, `jumlah_permintaan`). `getNextPermintaanId` replicates `store.js`'s `getNextId(items,"PMT")` id-generation exactly (max numeric suffix +1, zero-padded to 3 digits, collision-skip). Tanggal mutual-default normalization (`normalizeTanggal`) mirrors `store.js`'s `normalizePermintaanEntry`.
- `permintaanSchemas.js`: `permintaanCreateSchema`/`permintaanUpdateSchema` — Zod schemas with Indonesian field messages; `jumlah_permintaan` uses `z.coerce.number().positive(...)` to hard-reject zero/negative tonase server-side (T-08-P-NEG) regardless of client-side validation; both schemas serve as the mass-assignment allowlist (T-08-P-MASS).
- `permintaanRoutes.js`: `GET /` and `GET /duplikat` open to any authenticated role; `POST /`, `PUT /:id`, `DELETE /:id` require `requireAuth` + `requireRole("Admin")`, with `validate(...)` guarding both write bodies. `GET /duplikat` reads `kota`/`tanggal_permintaan`/`excludeId` query params and calls `hasPermintaanDuplikat` with the correct arg-key mapping.
- Mounted in `index.js` (`app.use("/permintaan", permintaanRouter)`) above the "keep last" `errorHandler` line; confirmed `/health`, `/auth`, `/kota`, `/stok-tbs` unaffected.
- `permintaanRoutes.verify.mjs` — idempotent end-to-end script: logs in as admin/logistik, asserts `GET /permintaan` 200 array, `POST /permintaan` as logistik 403, `POST` with `jumlah_permintaan: -1` 400 with `fields.jumlah_permintaan`, valid `POST` 201 with a generated `PMT-###` id, `GET /duplikat` returns `{ duplikat: true }` for the just-created row, `PUT` as logistik 403, `PUT` as admin 200 with a confirmed partial-merge (only `jumlah_permintaan` changed, `kota` untouched), `DELETE` as admin 200 (self-clean), and `DELETE` as logistik 403 on a second throwaway row (also self-cleaned). Ran twice consecutively with identical `PERMINTAAN_ROUTES_OK true` output and exit code 0 both times, confirming idempotency.

## Task Commits

Each task was committed atomically:

1. **Task 1: permintaanService with snake_case<->camelCase mapping + ID generation** - `62be85c` (feat)
2. **Task 2: Permintaan router with RBAC + Zod + duplicate-check, mounted** - `441d021` (feat)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); SUMMARY.md/STATE.md are written to disk only, batch-committed once after Phase 10.

## Files Created/Modified

- `server/src/services/permintaanService.js` - `getPermintaan`, `hasPermintaanDuplikat`, `addPermintaan`, `updatePermintaan`, `removePermintaan`, plus private `toApi`/`toDb`/`normalizeTanggal`/`getNextPermintaanId` helpers
- `server/src/schemas/permintaanSchemas.js` - `permintaanCreateSchema`, `permintaanUpdateSchema`
- `server/src/routes/permintaanRoutes.js` - Express router: `GET /`, `GET /duplikat`, `POST /`, `PUT /:id`, `DELETE /:id`
- `server/src/routes/permintaanRoutes.verify.mjs` - Standalone idempotent verify script
- `server/src/index.js` - Imported and mounted `permintaanRouter` above the error handler

## Decisions Made

- Notification/anomaly-notification/activity-log side effects from `store.js`'s `addPermintaan` (LOGIC-03) are explicitly NOT implemented in this plan — deferred to 08-05 per the plan's own objective, which will extend `addPermintaan`/`updatePermintaan`/`removePermintaan` with those effects rather than this plan duplicating logic that would need to change again
- `toDb` builds its update object using `Object.prototype.hasOwnProperty` checks rather than spreading `updates` directly — this is what makes `updatePermintaan`'s partial-merge behavior correct (a `PUT` with only `{ jumlah_permintaan: 99 }` does not null out `kota`/`tanggal_permintaan`/etc.)
- `updatePermintaan`/`removePermintaan` pre-check existence via `prisma.findUnique` and throw a `statusCode: 404`-tagged error for a clean "Data permintaan tidak ditemukan." message, consistent with the `errorHandler` convention established in 08-01 (`err.statusCode` preferred over message-matching)

## Deviations from Plan

None - plan executed exactly as written. No auto-fixes, no architectural changes, no scope creep beyond the two tasks specified. The verify script additionally asserts `PUT`/`DELETE` RBAC-deny (403) and a partial-merge check beyond the plan's minimum acceptance criteria, matching the thoroughness level established by `kotaRoutes.verify.mjs` in 08-02.

## Issues Encountered

None. Both tasks' automated verify commands passed on the first run. `permintaanRoutes.verify.mjs` was additionally run a second time to confirm idempotency (both runs reported all `*_OK true` lines and exit code 0). A standalone `/health` check after mounting the new router confirmed no regression to existing routes.

## User Setup Required

None - Docker Desktop / `switera-db-1` (Postgres 16) was already running and seeded from prior phases; this plan added no migration, no new env var, no new dependency.

## Next Phase Readiness

- The Permintaan service/router pair is ready for 08-05 to extend `addPermintaan`/`updatePermintaan`/`removePermintaan` with notification + anomaly-notification + activity-log side effects (LOGIC-03), without needing to touch the CRUD/mapping/RBAC/validation layer built here
- `errorHandler` remains mounted last in `index.js`; the "keep last" comment is still accurate
- No blockers carried forward. `npx prisma migrate status` confirms no schema drift (this plan added no migration, as expected — the Permintaan table already existed from Phase 6)
- Remaining Phase 8 plans: 08-04 (keputusan + LOGIC-02 race fix, wave 2 — independent of this plan), 08-05 (ranking/KPI LOGIC-01 + permintaan notification/activity wiring, wave 3), 08-06 (notifikasi/activityLog LOGIC-03 for kota/stok + cleanup, wave 4)

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-24*

## Self-Check: PASSED

All created files confirmed on disk: server/src/services/permintaanService.js, server/src/schemas/permintaanSchemas.js, server/src/routes/permintaanRoutes.js, server/src/routes/permintaanRoutes.verify.mjs.
All task commits confirmed in git log: 62be85c, 441d021.
