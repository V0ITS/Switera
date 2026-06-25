---
phase: 08-domain-crud-endpoints
plan: 04
subsystem: api
tags: [express, prisma, zod, rbac, keputusan, race-condition, optimistic-locking, postgres]

# Dependency graph
requires:
  - phase: 08-domain-crud-endpoints
    plan: 01
    provides: validate(schema) Zod middleware, errorHandler (statusCode-aware), CORS lock
provides:
  - keputusanService.js (getKeputusan, getRiwayatKeputusan, addKeputusan, updateKeputusan, removeKeputusan, restoreKeputusan) — Prisma-backed, store.js snake_case shape preserved via toApi/toDb mappers
  - LOGIC-02 closed: race-safe updateKeputusan using optimistic-lock conditional updateMany, proven exactly-one-winner at both the service layer and live HTTP layer
  - keputusanSchemas.js (keputusanCreateSchema, keputusanUpdateSchema)
  - GET/POST/PUT/DELETE /keputusan + POST /:id/restore + GET /riwayat-keputusan (RBAC + Zod guarded)
  - keputusanService.race.verify.mjs + keputusanRoutes.verify.mjs — concurrent-request verify scripts
affects: [08-05, 08-06, 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic-lock write: prisma.<model>.updateMany({ where: { id, status: existingStatusReadJustBefore }, data }) as the single atomicity boundary for a check-then-act status transition — the standard fix for a TOCTOU race without pessimistic row locking or a $transaction"
    - "Same-target-status guard: a status-change request is only a legitimate winning transition when the read-time status differs from the requested target status; if it already matches, reject as a 409 conflict rather than letting a no-op UPDATE...WHERE status=X SET status=X silently report success"
    - "updateKeputusan returns { updated, statusBerubah, existingStatus } so a future LOGIC-03 wrapper (08-05) can decide whether to fire side effects without re-reading the row"

key-files:
  created:
    - server/src/services/keputusanService.js
    - server/src/schemas/keputusanSchemas.js
    - server/src/services/keputusanService.race.verify.mjs
    - server/src/routes/keputusanRoutes.js
    - server/src/routes/keputusanRoutes.verify.mjs
  modified:
    - server/src/index.js

key-decisions:
  - "LOGIC-02 race-safety mechanism: optimistic locking via conditional prisma.keputusan.updateMany({ where: { id, status: existing.status } }), NOT a unique constraint or a $transaction with row locking — binding decision carried from phase planning, confirmed correct under live HTTP load after one fix (see Deviations)"
  - "updateKeputusan rejects a status-change request as a 409 conflict whenever the read-time status does NOT differ from the requested target status — this closes a same-target-status TOCTOU that a naive updateMany guard alone does not catch (see Deviations)"
  - "GET /riwayat-keputusan mounted as its own top-level route in index.js (not nested under /keputusan) reusing keputusanService.getRiwayatKeputusan, matching the ROADMAP/REQUIREMENTS treatment of riwayatKeputusan as its own data domain"
  - "PUT /keputusan/:id (status-change only) allow-lists Tim Logistik in addition to Admin/Manajer Distribusi, matching StatusDistribusi.jsx's workflow scope; POST/DELETE/restore remain Admin + Manajer Distribusi only"

requirements-completed: [API-01, API-02, LOGIC-02, AUTH-03]

# Metrics
duration: 48min
completed: 2026-06-25
status: complete
---

# Phase 8 Plan 4: Keputusan Domain Router + LOGIC-02 Race Fix Summary

**Race-safe Keputusan (distribution decision) REST API closing LOGIC-02 — the one genuinely concurrency-prone mutation in the app — via optimistic-lock conditional `updateMany`, proven to produce exactly one 200 and one 409 under concurrent load at both the service layer and live HTTP layer, after a same-target-status TOCTOU bug surfaced and was fixed during verification.**

## Performance

- **Duration:** ~48 min (including the live-HTTP flakiness investigation and fix)
- **Completed:** 2026-06-25
- **Tasks:** 2 completed (+ 1 post-verification fix commit)
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- `keputusanService.js`: `getKeputusan`, `getRiwayatKeputusan`, `addKeputusan`, `updateKeputusan`, `removeKeputusan`, `restoreKeputusan` — ported from `src/store.js`, with `toApi(row)`/`toDb(entry)` mappers translating Prisma's camelCase (`kotaTujuanNama`, `volumeTbs`, `tanggalKeputusan`, `diputuskanOleh`, four `waktu*` DateTime columns) to/from the store.js snake_case API contract.
- `updateKeputusan` closes LOGIC-02: the optimistic-lock write `prisma.keputusan.updateMany({ where: { id, status: existing.status }, data })` makes the UPDATE itself the lock — PostgreSQL guarantees only one of two concurrent identical-predicate UPDATE statements can match a single row. The loser gets a `statusCode: 409` Indonesian conflict error ("Status keputusan sudah diperbarui oleh proses lain...").
- `keputusanSchemas.js`: `keputusanCreateSchema`/`keputusanUpdateSchema` — Zod schemas with Indonesian field messages; `volume_tbs` uses `z.coerce.number().positive(...)` (T-08-D-NEG); both schemas serve as the mass-assignment allowlist (T-08-D-MASS).
- `keputusanRoutes.js`: `GET /` and `GET /riwayat-keputusan` open to any authenticated role; `POST /`, `DELETE /:id`, `POST /:id/restore` require `requireAuth` + `requireRole("Admin", "Manajer Distribusi")`; `PUT /:id` additionally allow-lists `"Tim Logistik"` (status-change-only workflow per `StatusDistribusi.jsx`). `POST /:id/restore` 400s on path/body id mismatch before calling the service.
- Mounted in `index.js` (`app.use("/keputusan", keputusanRouter)` + a dedicated `app.get("/riwayat-keputusan", ...)`) above the "keep last" `errorHandler` line; confirmed `/health`, `/permintaan`, `/kota`, `/stok-tbs` unaffected.
- `keputusanService.race.verify.mjs` — service-layer concurrent-request test: `Promise.allSettled` on two `updateKeputusan` calls targeting the same id/target status, asserting exactly one fulfilled / one rejected with a `409`-tagged "sudah diperbarui" message. Idempotent and self-cleaning.
- `keputusanRoutes.verify.mjs` — live-HTTP end-to-end script: RBAC 403/allow, Zod 400, CRUD round-trip, AND the concurrent-PUT race test (`Promise.all` on two real `fetch` PUT requests) asserting exactly one `200` and one `409` over the wire. Idempotent and self-cleaning.

## Task Commits

Each task was committed atomically, plus one post-verification fix commit:

1. **Task 1: keputusanService with race-safe optimistic-locked updateKeputusan** - `efcbafb` (feat)
2. **Task 2: Keputusan router with RBAC + Zod + 409-mapped conflict, mounted** - `acf0707` (feat)
3. **Fix: close same-target-status TOCTOU surfaced by live-HTTP load testing** - `54d32da` (fix)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); SUMMARY.md/STATE.md are written to disk only, batch-committed once after Phase 10.

## Files Created/Modified

- `server/src/services/keputusanService.js` - `getKeputusan`, `getRiwayatKeputusan`, `addKeputusan`, `updateKeputusan` (race-safe), `removeKeputusan`, `restoreKeputusan`, plus private `toApi`/`toDb`/`getNextKeputusanId` helpers and the `WAKTU_FIELD_BY_STATUS` status->column map
- `server/src/schemas/keputusanSchemas.js` - `keputusanCreateSchema`, `keputusanUpdateSchema`
- `server/src/services/keputusanService.race.verify.mjs` - Standalone idempotent service-layer race verify script
- `server/src/routes/keputusanRoutes.js` - Express router: `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/restore`
- `server/src/routes/keputusanRoutes.verify.mjs` - Standalone idempotent live-HTTP verify script, including the concurrent-PUT race assertion
- `server/src/index.js` - Imported and mounted `keputusanRouter` (`/keputusan`) and a dedicated `GET /riwayat-keputusan` route, both above the error handler

## Decisions Made

- LOGIC-02's binding race-safety mechanism (optimistic locking via conditional `updateMany`, not a unique constraint or `$transaction` with row locking) was carried over from phase planning and confirmed correct under live concurrent HTTP load — after one fix (see Deviations below).
- `riwayatKeputusan` reads were mounted as a dedicated top-level `/riwayat-keputusan` route (not nested under `/keputusan/riwayat`) per the plan's instruction that it is its own data domain in the ROADMAP/REQUIREMENTS, not a sub-resource.
- `PUT /keputusan/:id` is the one keputusan write route Tim Logistik can call — it is the only route that maps to that role's `StatusDistribusi.jsx` workflow (status-only changes), while create/cancel/restore remain Admin + Manajer Distribusi only.
- `removeKeputusan`/`restoreKeputusan` follow the exact `src/store.js` dual-table semantics: cancel marks the historical row `"dibatalkan"` and deletes the live row (not a soft delete on the live table); restore re-creates the live row and overwrites the matching historical row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Closed a same-target-status TOCTOU in the optimistic-lock guard, surfaced only under live HTTP concurrent load**

- **Found during:** Task 2's own required verification step — running `keputusanRoutes.verify.mjs` (the live-HTTP concurrent-PUT race test) repeatedly per the success criteria's explicit instruction to "run by you directly, not just trusting the executor's self-report." The first few runs passed, but a 25-run stability sweep showed ~8% of runs (2/25, later reproduced again at 2/15 and 2/40 in further sweeps) produced `[200, 200]` instead of the required `[200, 409]`.
- **Issue:** The plan's specified guard (`updateMany({ where: { id, status: existing.status }, data })`) is correct as a general optimistic lock, but has a gap when two concurrent requests target the **same destination status**. If request A commits first (e.g. `menunggu` -> `dalam-pengiriman`) and request B's own `findUnique` read happens to land *after* A's commit, B observes `existing.status === "dalam-pengiriman"` — the exact value B itself intends to write. B's resulting `updateMany` becomes a true no-op SQL statement (`WHERE status='dalam-pengiriman' SET status='dalam-pengiriman'`) that still matches the row and reports `count: 1`, so B is told it succeeded even though it actually lost the race and merely re-confirmed A's already-applied change. This is invisible to the pure service-layer race test (`keputusanService.race.verify.mjs`, which fires the two `updateKeputusan` calls back-to-back with effectively zero gap) but became visible once Express/RBAC/Zod middleware overhead introduced enough timing spread (observed gaps of several milliseconds between the two requests entering the handler) for B's read to land after A's write commits.
- **Fix:** `updateKeputusan` now rejects a status-change request as a `409` conflict whenever the read-time status does **not** differ from the requested target status (i.e., `statusRequested && !statusBerubah`) — before even attempting the `updateMany`. This makes "the transition already happened, whether you caused it or a concurrent request did" a single, consistently-enforced rejection path, rather than depending on which physical UPDATE statement a request happens to issue.
- **Files modified:** `server/src/services/keputusanService.js`
- **Verification:** Diagnosed with three standalone debug scripts (deleted after use, never committed): (1) 120 direct service-layer calls with zero anomalies, ruling out the service wrapper; (2) 50 raw-Prisma-only calls with zero anomalies, ruling out Prisma/Postgres-level non-atomicity; (3) a deliberately staged repro (A commits, then B reads) that reproduced `count:1` on both writes on the first attempt, confirming the exact mechanism. After the fix: 50 consecutive `keputusanRoutes.verify.mjs` runs with 0 failures (was ~8% before), plus a further 25-run sweep with 0 failures, plus repeated `keputusanService.race.verify.mjs` runs all green.
- **Committed in:** `54d32da` (separate `fix` commit, after both task commits)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug found via the plan's own mandated repeated-verification step)
**Impact on plan:** Necessary correctness fix to the plan's headline deliverable (LOGIC-02). No scope creep — the fix is a 3-line guard added to the exact function the plan specified, with no new files, no architectural change, and no change to the documented optimistic-locking mechanism (it is still a conditional `updateMany`, just with a corrected predicate for the same-target-status edge case).

## Issues Encountered

The investigation above (diagnosing the ~8% live-HTTP race failure) was the only nontrivial issue. It required ruling out three layers (service function, raw Prisma calls, Express/RBAC/Zod middleware) before isolating the actual TOCTOU window, since the pure service-layer verify script never reproduced it (the gap only opens once HTTP-stack overhead spreads out the two requests' read timing). All temporary debug scripts (`race-debug*.tmp.mjs`) were created inside `server/` for module resolution, then deleted before the fix commit — none were committed.

## User Setup Required

None - Docker Desktop / `switera-db-1` (Postgres 16) was already running and seeded from prior phases; this plan added no migration, no new env var, no new dependency. `npx prisma migrate status` confirmed "Database schema is up to date!" both before and after this plan.

## Next Phase Readiness

- `keputusanService`'s `updateKeputusan` returns `{ updated, statusBerubah, existingStatus }` specifically so 08-05 (LOGIC-03: notification + activity-log side effects) can wrap this function without re-reading the row or re-deriving whether the status actually changed.
- `errorHandler` remains mounted last in `index.js`; the "keep last" comment is still accurate.
- The concurrent-request verification pattern established here (`Promise.allSettled`/`Promise.all` racing two identical mutations, repeated N times to catch low-probability TOCTOU windows, not just a single run) is reusable for any future phase that introduces another check-then-act mutation.
- No blockers carried forward. Remaining Phase 8 plans: 08-05 (ranking/KPI LOGIC-01 + permintaan notification/activity wiring, wave 3, depends on this plan's `keputusanService`), 08-06 (notifikasi/activityLog LOGIC-03 for kota/stok + cleanup, wave 4).

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-25*

## Self-Check: PASSED

All created files confirmed on disk: server/src/services/keputusanService.js, server/src/schemas/keputusanSchemas.js, server/src/services/keputusanService.race.verify.mjs, server/src/routes/keputusanRoutes.js, server/src/routes/keputusanRoutes.verify.mjs.
All commits confirmed in git log: efcbafb, acf0707, 54d32da.
