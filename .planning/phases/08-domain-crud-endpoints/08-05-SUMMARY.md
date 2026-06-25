---
phase: 08-domain-crud-endpoints
plan: 05
subsystem: api
tags: [express, prisma, ranking, kpi, distribusi, logic-01]

# Dependency graph
requires:
  - phase: 08-domain-crud-endpoints
    plan: 01
    provides: stokService.getStokTbs, errorHandler (statusCode-aware)
  - phase: 08-domain-crud-endpoints
    plan: 02
    provides: kotaService.getDaftarKota/updateKota
  - phase: 08-domain-crud-endpoints
    plan: 03
    provides: permintaanService.getPermintaan
  - phase: 08-domain-crud-endpoints
    plan: 04
    provides: keputusanService.getKeputusan
provides:
  - distribusiService.js (getRekomendasiDistribusi, getKpiMetrics) — verbatim-ported ranking/KPI algorithm from src/utils/distribusi.js, reading kota/permintaan/stok/keputusan services fresh on every call
  - LOGIC-01 closed: no module-level caching of the three/four input arrays — proven by a direct-DB-mutation freshness test
  - GET /rekomendasi-distribusi, GET /kpi (requireAuth only, any authenticated role)
  - distribusiService.freshness.verify.mjs + distribusiRoutes.verify.mjs — verify scripts
affects: [09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fresh-read service wrapper: an async function performs its data-fetching calls to other services INSIDE its own function body (never hoisted to module scope), so every invocation re-queries the database — the binding LOGIC-01 mechanism for any future server-side calculation that must never go stale"
    - "Router mounted with no prefix (app.use(router) instead of app.use('/prefix', router)) when the router itself defines full top-level paths, to match a literal ROADMAP endpoint name exactly (Express 5 supports this)"

key-files:
  created:
    - server/src/services/distribusiService.js
    - server/src/services/distribusiService.freshness.verify.mjs
    - server/src/routes/distribusiRoutes.js
    - server/src/routes/distribusiRoutes.verify.mjs
  modified:
    - server/src/index.js

key-decisions:
  - "distribusiService.js imports getDaftarKota/getPermintaan/getStokTbs/getKeputusan from the existing service layer — it never calls Prisma directly, keeping all DB access behind the already-validated service functions (per the plan's threat model T-08-R-INJECT disposition)"
  - "Both GET /rekomendasi-distribusi and GET /kpi are requireAuth-only (no requireRole) — consistent with kota/permintaan GET routes; ranking/KPI data is read across all three roles' dashboards"
  - "distribusiRouter mounted via app.use(distribusiRouter) with no prefix, since the router itself defines the full paths /rekomendasi-distribusi and /kpi — matches the literal ROADMAP endpoint names instead of nesting under a shared prefix"

requirements-completed: [LOGIC-01, AUTH-03]

# Metrics
duration: 5min
completed: 2026-06-25
status: complete
---

# Phase 8 Plan 5: Ranking/KPI Engine (LOGIC-01) Summary

**Server-side ranking/recommendation engine and KPI metrics ported verbatim from src/utils/distribusi.js, reading live kota/permintaan/stok/keputusan data fresh on every call with zero caching, exposed via GET /rekomendasi-distribusi and GET /kpi.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-06-25
- **Tasks:** 2 completed
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `distribusiService.js`: `parseDate`, `aggregatePermintaanRanking`, `computeRekomendasiDistribusi`, `computeKpiMetrics` copied verbatim from `src/utils/distribusi.js` — identical 0.65 demand-weight / 0.35 capacity-weight scoring, identical greedy allocation walk against `stokTbs`, identical KPI formulas (fulfillment rate, on-time rate, avg cycle hours, city coverage).
- `getRekomendasiDistribusi()` and `getKpiMetrics()` fetch their input arrays (`getPermintaan()`, `getDaftarKota()`, `getStokTbs()`, `getKeputusan()`) **inside their own function body** on every call — no module-level variable holds these arrays between requests, closing LOGIC-01.
- `distribusiService.freshness.verify.mjs`: calls `getRekomendasiDistribusi()`, mutates Pekanbaru's `kapasitas` directly via `kotaService.updateKota`, calls `getRekomendasiDistribusi()` again, and asserts the second call's `kapasitas`/`skor` for Pekanbaru reflects the new value — then reverts the mutation. Confirmed across two consecutive runs (`kapasitas=320` -> mutate to `999` -> reverts to `320` cleanly both times).
- `distribusiRoutes.js`: `GET /rekomendasi-distribusi` and `GET /kpi`, both `requireAuth`-only (no role restriction — ranking/KPI data is read across Admin/Manajer Distribusi/Tim Logistik dashboards). Mounted in `index.js` via `app.use(distribusiRouter)` (no prefix, since the router defines the full literal paths) above the central error handler.
- `distribusiRoutes.verify.mjs`: live-HTTP script logging in as `manajer`, asserting `GET /rekomendasi-distribusi` -> 200 array with `kota`/`totalPermintaan`/`kapasitas`/`skor`/`alokasi` keys (8 items, one per seeded city), `GET /kpi` -> 200 object with the five KPI keys, and `GET /rekomendasi-distribusi` with no Authorization header -> 401.
- Manual end-to-end confirmation beyond the automated scripts: logged in as admin, called `GET /rekomendasi-distribusi` (Pekanbaru: kapasitas=320, skor=97), then `PUT /kota/Pekanbaru` with kapasitas=50, then called `GET /rekomendasi-distribusi` again — Pekanbaru's kapasitas/skor changed to 50/68 on the very next call, then reverted to 320. This is the literal ROADMAP success criterion #4 for LOGIC-01.

## Task Commits

Each task was committed atomically:

1. **Task 1: distribusiService — verbatim ranking/KPI algorithm reading live DB on every call** - `dfabfad` (feat)
2. **Task 2: Ranking/KPI router (read-only, any authenticated role), mounted** - `369db93` (feat)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); SUMMARY.md/STATE.md are written to disk only, batch-committed once after Phase 10.

## Files Created/Modified

- `server/src/services/distribusiService.js` - `getRekomendasiDistribusi`, `getKpiMetrics` (fresh-read wrappers), plus the verbatim-ported `parseDate`/`aggregatePermintaanRanking`/`computeRekomendasiDistribusi`/`computeKpiMetrics` private functions
- `server/src/services/distribusiService.freshness.verify.mjs` - Standalone idempotent freshness verify script (direct-DB-mutation test)
- `server/src/routes/distribusiRoutes.js` - Express router: `GET /rekomendasi-distribusi`, `GET /kpi`
- `server/src/routes/distribusiRoutes.verify.mjs` - Standalone idempotent live-HTTP verify script
- `server/src/index.js` - Imported and mounted `distribusiRouter` (no prefix) above the error handler

## Decisions Made

- `distribusiService.js` performs zero direct Prisma calls — it only imports and calls the already-built `kotaService`/`permintaanService`/`stokService`/`keputusanService` functions, keeping all DB access behind the validated service layer (per plan's threat model T-08-R-INJECT: "verified non-issue").
- Both routes are `requireAuth`-only with no `requireRole` restriction, matching the established pattern for GET routes elsewhere in Phase 8 (kota, permintaan) — ranking/KPI data is consumed across all three roles' UI surfaces (`AnalisisRanking.jsx`, `KeputusanDistribusi.jsx`, `Laporan.jsx`, `Dashboard.jsx`).
- `distribusiRouter` mounted via `app.use(distribusiRouter)` (no path prefix) because the router itself defines the full top-level paths `/rekomendasi-distribusi` and `/kpi` — this matches the ROADMAP success criterion's literal endpoint names exactly, rather than nesting under e.g. `/distribusi/rekomendasi-distribusi`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria were met on the first implementation without requiring auto-fixes.

## Issues Encountered

None. Both verify scripts (`distribusiService.freshness.verify.mjs`, `distribusiRoutes.verify.mjs`) passed on the first run and were re-run a second time each to confirm idempotency, plus a manual curl-equivalent test (PUT /kota between two GET /rekomendasi-distribusi calls) to directly confirm the literal ROADMAP success criterion. No regressions found in `kotaRoutes.verify.mjs` or `permintaanRoutes.verify.mjs` after this plan's `index.js` change.

## User Setup Required

None - Docker Desktop / `switera-db-1` (Postgres 16) was already running and seeded from prior phases; this plan added no migration, no new env var, no new dependency.

## Next Phase Readiness

- `distribusiService.js` is available for 08-06 or Phase 9 to import if any other server-side feature needs ranking/KPI data.
- Note: per the actual `08-05-PLAN.md` on disk (re-confirmed at execution time against `08-04-SUMMARY.md`'s "Next Phase Readiness" note and `STATE.md`'s `last_activity_desc`), LOGIC-03 (permintaan/keputusan notification + activity-log side-effect wiring) is documented as deferred to this plan in earlier planning notes, but the actual 08-05-PLAN.md frontmatter/tasks on disk scope this plan to LOGIC-01 + AUTH-03 only (ranking/KPI engine) — LOGIC-03 is NOT implemented by this plan. This matches `.planning/STATE.md`'s `[Phase 08 plan-check, revision round 1]` decision log entry, which records that 08-06 (not 08-05) was extended to own activity-log wiring and moved to wave 4. Executed exactly what is on disk in `08-05-PLAN.md`; flagging this discrepancy between an older STATE.md narrative note and the binding plan file so it is not mistaken for a missed deliverable.
- 1 plan remains in Phase 8: 08-06 (notifikasi/activityLog LOGIC-03 for kota/stok/permintaan/keputusan + cleanup, wave 4, depends on 08-05's services existing).
- `errorHandler` remains mounted last in `index.js`; "keep last" comment still accurate.

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-25*

## Self-Check: PASSED

All created files confirmed on disk: server/src/services/distribusiService.js, server/src/services/distribusiService.freshness.verify.mjs, server/src/routes/distribusiRoutes.js, server/src/routes/distribusiRoutes.verify.mjs.
All commits confirmed in git log: dfabfad, 369db93.
