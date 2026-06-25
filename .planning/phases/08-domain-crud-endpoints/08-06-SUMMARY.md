---
phase: 08-domain-crud-endpoints
plan: 06
subsystem: api
tags: [express, prisma, logic-03, activity-log, notifikasi, rest]

# Dependency graph
requires:
  - phase: 08-domain-crud-endpoints
    plan: 01
    provides: errorHandler (statusCode-aware), CORS lock
  - phase: 08-domain-crud-endpoints
    plan: 02
    provides: kotaService.tambahKota/updateKota/hapusKota, stokService.setStokTbs
  - phase: 08-domain-crud-endpoints
    plan: 03
    provides: permintaanService.addPermintaan/updatePermintaan/removePermintaan
  - phase: 08-domain-crud-endpoints
    plan: 04
    provides: keputusanService.addKeputusan/updateKeputusan/removeKeputusan/restoreKeputusan, optimistic-lock statusBerubah outcome
provides:
  - notifikasiService.js (getNotifikasi, tambahNotifikasi, tandaiDibaca, tandaiSemuaDibaca) — ported from src/store.js
  - activityLogService.js (getActivityLog, catatAktivitas) — ported from src/store.js
  - GET/PUT /notifikasi (no role gate) + GET /activity-log (Admin-only) — completes API-01's full 7-domain coverage
  - LOGIC-03 closed in full: catatAktivitas/tambahNotifikasi wired into addPermintaan/updatePermintaan/removePermintaan, addKeputusan/updateKeputusan/removeKeputusan/restoreKeputusan, tambahKota/updateKota/hapusKota, and setStokTbs — every src/store.js mutation that calls recordActivity today has a server-side equivalent firing inside the same request
  - lifecycleHooks.verify.mjs — proves same-request generation for permintaan/keputusan/kota/stok
  - Phase 7's throwaway /protected demo router retired (protectedRoutes.js + its rbac.verify.mjs deleted)
affects: [09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LOGIC-03 side-effect wiring: a mutation's notification/activity-log generation lives INSIDE the mutating service function's own async body, awaited in sequence before the function returns — never a separate route the frontend calls second"
    - "Identity crossing convention: req.user.username/req.user.role are passed as explicit trailing (aktor, role) string arguments from the route layer into the service call — services never read req.user themselves, keeping the service layer framework-agnostic"
    - "Side effects after the lock, not before: updateKeputusan's notification/activity calls happen strictly after the optimistic-lock updateMany confirms count===1, so the 409-losing request's code path never reaches the side-effect calls (no duplicate-fire on a lost race)"

key-files:
  created:
    - server/src/services/notifikasiService.js
    - server/src/services/activityLogService.js
    - server/src/routes/notifikasiRoutes.js
    - server/src/routes/activityLogRoutes.js
    - server/src/routes/lifecycleHooks.verify.mjs
  modified:
    - server/src/services/permintaanService.js
    - server/src/services/keputusanService.js
    - server/src/services/kotaService.js
    - server/src/services/stokService.js
    - server/src/routes/permintaanRoutes.js
    - server/src/routes/keputusanRoutes.js
    - server/src/routes/kotaRoutes.js
    - server/src/routes/stokRoutes.js
    - server/src/index.js
    - server/src/services/kotaService.verify.mjs
    - server/src/services/distribusiService.freshness.verify.mjs
    - server/src/services/keputusanService.race.verify.mjs
  deleted:
    - server/src/routes/protectedRoutes.js
    - server/src/middleware/rbac.verify.mjs

key-decisions:
  - "aktor uses req.user.username (already on the JWT payload, zero extra query) rather than fetching Akun.nama — pragmatic choice recorded explicitly per the plan's interface note"
  - "kota/stok mutations (tambahKota/updateKota/hapusKota/setStokTbs) fire catatAktivitas only, never tambahNotifikasi — matches src/store.js exactly, which never calls pushNotifikasi from any of these four functions"
  - "updateKota's activity-log message uses the OLD city name (namaLama), not the new one, even on a successful rename — ported verbatim from src/store.js:301, not 'fixed'"
  - "updateKeputusan's side effects are gated behind statusBerubah AND placed strictly after the optimistic-lock updateMany's count===1 confirmation — the 409-losing concurrent request never reaches the tambahNotifikasi/catatAktivitas calls, so LOGIC-02's race-safety and LOGIC-03's side-effect generation compose correctly with zero double-fire risk"
  - "No POST /activity-log route exists — catatAktivitas is internal-only, reachable solely as a side effect of permintaan/keputusan/kota/stok mutations, the literal mechanism the threat model's T-08-N-NOPOST disposition requires"

requirements-completed: [API-01, LOGIC-03]

# Metrics
duration: 35min
completed: 2026-06-25
status: complete
---

# Phase 8 Plan 6: Notifikasi/ActivityLog REST + Full LOGIC-03 Closure Summary

**Notifikasi and ActivityLog domains promoted to real REST endpoints (closing API-01's 7-domain coverage), with catatAktivitas/tambahNotifikasi wired directly into every src/store.js-instrumented mutation — permintaan, keputusan, kota, AND stok, not just the two richest-side-effect domains — proving every activity-log/notification row is generated inside the same request as its triggering mutation, and retiring the Phase 7 throwaway /protected demo router.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-06-25
- **Tasks:** 2 completed
- **Files modified:** 17 (5 created, 12 modified/deleted)

## Accomplishments

- `notifikasiService.js`: `getNotifikasi`, `tambahNotifikasi`, `tandaiDibaca`, `tandaiSemuaDibaca` — ported from `src/store.js`'s `pushNotifikasi`/internal helpers, with a local `getNextNotifikasiId()` replicating the `getNextId(items,"NTF")` algorithm exactly.
- `activityLogService.js`: `getActivityLog`, `catatAktivitas` — ported from `src/store.js`'s `pushActivity`/`recordActivity`, with a local `getNextActivityLogId()` replicating `getNextId(items,"LOG")`.
- `notifikasiRoutes.js`: `GET /`, `PUT /:id/baca`, `PUT /baca-semua` — all `requireAuth`-only (no role gate; notifikasi is a cross-cutting `Layout.jsx` feature, not Admin-gated in `src/utils/navigation.js`). No POST route — generation is internal-only.
- `activityLogRoutes.js`: `GET /` — `requireAuth` + `requireRole("Admin")` (matches `src/utils/navigation.js`'s Admin-only "Riwayat Aktivitas" menu). No POST route exists at all — `catatAktivitas` is reachable only as an internal side effect, never a direct client call, the literal mechanism LOGIC-03 and threat T-08-N-NOPOST require.
- Both routers mounted in `index.js` (`/notifikasi`, `/activity-log`) above the "keep last" `errorHandler` line.
- **Full LOGIC-03 wiring across all four mutating services, not a permintaan/keputusan-only subset:**
  - `permintaanService.addPermintaan(entry, aktor, role)` — reads `riwayatSebelumnya` for the kota BEFORE the insert (matching `src/store.js:363`'s ordering), creates the row, pushes the "Data permintaan baru" notification, conditionally pushes the "Anomali permintaan terdeteksi" warning notification when the new amount exceeds 1.5x the historical average, then records the activity-log entry — all inside one async function body.
  - `permintaanService.updatePermintaan`/`removePermintaan` — now take `(aktor, role)` and record their respective activity-log messages (`Mengubah data permintaan kota ...` / `Menghapus data permintaan kota ...`) with no notification (matching `src/store.js`).
  - `keputusanService.addKeputusan(entry, aktor, role)` — after the dual-table create commits, pushes "Keputusan distribusi baru" notification + records activity.
  - `keputusanService.updateKeputusan(id, updates, aktor, role)` — side effects (notification + activity, using `statusLabelMap` ported verbatim) fire ONLY when `statusBerubah` is true AND strictly after the optimistic-lock `updateMany` confirms `count===1` — the 409-losing concurrent request's code path throws before ever reaching the side-effect calls, so LOGIC-02's race fix and LOGIC-03's generation compose with zero double-fire risk.
  - `keputusanService.removeKeputusan`/`restoreKeputusan` — now take `(aktor, role)`, record their activity-log messages, no notification.
  - `kotaService.tambahKota`/`updateKota`/`hapusKota` — each now take `(aktor, role)` and call `catatAktivitas` with the exact `src/store.js` message text (`updateKota` deliberately logs the OLD city name, `namaLama`, even on a successful rename — ported verbatim, not "fixed"). No notification for any of the three (`src/store.js` never fires one from these).
  - `stokService.setStokTbs(value, aktor, role)` — calls `catatAktivitas` with the SAME coerced `numericValue` already written to the DB (not the raw input), matching `src/store.js:328` exactly.
- `permintaanRoutes.js`/`keputusanRoutes.js`/`kotaRoutes.js`/`stokRoutes.js` — every mutating handler now passes `req.user.username, req.user.role` as the trailing service-call arguments; services never read `req.user` themselves.
- Retired the Phase 7 throwaway `/protected` demo router: deleted `protectedRoutes.js`, removed its import/mount from `index.js`. Confirmed live: `GET /protected/me` now returns `404` (router gone), `GET /health` still `200`.
- `lifecycleHooks.verify.mjs` — new idempotent, self-cleaning live-HTTP script: logs in as admin, then for each of permintaan/keputusan/kota/stok performs the mutation and IMMEDIATELY (no second client call) reads `GET /activity-log` and/or `GET /notifikasi`, asserting the newest row matches the exact expected message. Ran twice consecutively with identical `LIFECYCLE_HOOKS_OK true` output and clean DB state both times (confirmed via a follow-up query: zero leftover `__LifecycleHooksVerifyTemp__` kota rows, zero leftover `lifecycleHooks`-tagged permintaan/keputusan rows).

## Task Commits

Each task was committed atomically (server/ paths only, per the `commit_docs: false` override for Phases 6-10):

1. **Task 1: notifikasiService + activityLogService and their REST routers** - `373f825` (feat)
2. **Task 2: wire LOGIC-03 hooks into permintaan/keputusan/kota/stok mutations, retire /protected** - `b1757c2` (feat)

**Plan metadata:** Not committed — `.planning/` commits are deliberately suppressed for Phases 6-10 per project override (`commit_docs: false`); this SUMMARY.md and STATE.md are written to disk only, batch-committed once after Phase 10.

## Files Created/Modified

- `server/src/services/notifikasiService.js` - `getNotifikasi`, `tambahNotifikasi`, `tandaiDibaca`, `tandaiSemuaDibaca`, plus private `getNextNotifikasiId`
- `server/src/services/activityLogService.js` - `getActivityLog`, `catatAktivitas`, plus private `getNextActivityLogId`
- `server/src/routes/notifikasiRoutes.js` - `GET /`, `PUT /:id/baca`, `PUT /baca-semua`
- `server/src/routes/activityLogRoutes.js` - `GET /` (Admin-only)
- `server/src/routes/lifecycleHooks.verify.mjs` - Standalone idempotent live-HTTP verify script proving same-request generation across all 4 domains
- `server/src/services/permintaanService.js` - `addPermintaan`/`updatePermintaan`/`removePermintaan` extended with `(aktor, role)` + LOGIC-03 side effects
- `server/src/services/keputusanService.js` - `addKeputusan`/`updateKeputusan`/`removeKeputusan`/`restoreKeputusan` extended with `(aktor, role)` + LOGIC-03 side effects; added local `statusLabelMap`
- `server/src/services/kotaService.js` - `tambahKota`/`updateKota`/`hapusKota` extended with `(aktor, role)` + `catatAktivitas`
- `server/src/services/stokService.js` - `setStokTbs` extended with `(aktor, role)` + `catatAktivitas`
- `server/src/routes/permintaanRoutes.js`, `keputusanRoutes.js`, `kotaRoutes.js`, `stokRoutes.js` - pass `req.user.username, req.user.role` to the extended service calls
- `server/src/index.js` - mounted `/notifikasi`, `/activity-log`; removed `/protected` import + mount
- `server/src/services/kotaService.verify.mjs`, `distribusiService.freshness.verify.mjs`, `keputusanService.race.verify.mjs` - fixed to pass the new required `(aktor, role)` args (see Deviations)
- `server/src/routes/protectedRoutes.js` - **deleted** (Phase 7 throwaway demo router)
- `server/src/middleware/rbac.verify.mjs` - **deleted** (orphaned verify script for the deleted router)

## Decisions Made

- `aktor` = `req.user.username` (zero extra DB query, already on the JWT payload), not `Akun.nama` — pragmatic choice per the plan's interface note, not a silent assumption.
- kota/stok mutations fire `catatAktivitas` only, never `tambahNotifikasi` — exactly matches `src/store.js`, which never calls `pushNotifikasi` from `tambahKota`/`updateKota`/`hapusKota`/`setStokTbs`.
- `updateKota`'s activity-log message uses the OLD city name (`namaLama`) even on a successful rename, ported verbatim from `src/store.js:301` — explicitly NOT "fixed" to use the new name, per the plan's explicit instruction.
- `updateKeputusan`'s side effects are placed strictly after the optimistic-lock `updateMany`'s `count===1` confirmation, gated by `statusBerubah` — this is the binding composition of LOGIC-02 (08-04) and LOGIC-03 (this plan): the 409 loser's code path throws before it can ever reach the notification/activity calls.
- No `POST /activity-log` route exists — `catatAktivitas` is reachable only as an internal side effect of a real mutation, never directly by a client, matching the threat model's `T-08-N-NOPOST` disposition ("a client cannot inject a fake log entry independent of a real mutation").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 3 pre-existing verify scripts that called the now-extended service functions without the new required (aktor, role) args**

- **Found during:** Task 2, immediately after wiring `catatAktivitas` into `kotaService`/`keputusanService` and running the plan's own regression sweep across pre-existing verify scripts (not explicitly listed in the plan's `<files>`, but in scope per the deviation rules' "directly caused by the current task's changes" boundary).
- **Issue:** `server/src/services/kotaService.verify.mjs` (08-02), `server/src/services/distribusiService.freshness.verify.mjs` (08-05), and `server/src/services/keputusanService.race.verify.mjs` (08-04) all call `updateKota`/`hapusKota`/`addKeputusan`/`updateKeputusan`/`removeKeputusan` directly (bypassing the route layer) without the new trailing `(aktor, role)` arguments. Since `ActivityLog.aktor`/`ActivityLog.role` are non-nullable `String` columns in the Prisma schema, calling `catatAktivitas(undefined, undefined, aksi)` throws a `PrismaClientValidationError` ("Argument `aktor` is missing"). Confirmed by running `kotaService.verify.mjs`, which crashed mid-script on `checkCascadeRename`'s `updateKota` call, leaving `Padang` renamed to `Padang Baru` in the live dev DB (the transaction-wrapped rename committed; only the activity-log write afterward failed) with the script's own revert step never reached.
- **Fix:** Added literal `"verify-script", "Admin"` as the trailing args to every affected call site in the three scripts. Manually reverted the orphaned `Padang Baru -> Padang` rename left behind by the crashed run (confirmed via a direct DB query before and after the fix) before re-running.
- **Files modified:** `server/src/services/kotaService.verify.mjs`, `server/src/services/distribusiService.freshness.verify.mjs`, `server/src/services/keputusanService.race.verify.mjs`
- **Verification:** Re-ran all three scripts twice each — all green (`FK_JOIN_OK`/`BLOCK_DELETE_OK`/`CASCADE_RENAME_OK`; `FIRST_CALL_OK`/`DISTRIBUSI_FRESH_OK`/`CLEANUP_OK`; `KEPUTUSAN_RACE_OK`), confirming both the fix and idempotency. Also re-ran the full route-level verify suite (`kotaRoutes.verify.mjs`, `permintaanRoutes.verify.mjs`, `keputusanRoutes.verify.mjs`, `distribusiRoutes.verify.mjs`) — all green, confirming no other regression from the new required params.
- **Committed in:** `b1757c2` (Task 2 commit, alongside the LOGIC-03 wiring itself)

**2. [Rule 1 - Bug] Deleted the now-orphaned Phase 7 `rbac.verify.mjs`, which exclusively tested the retired `/protected` router**

- **Found during:** Task 2, while removing `protectedRoutes.js` per the plan's explicit instruction.
- **Issue:** `server/src/middleware/rbac.verify.mjs` (07-02) is a standalone script whose entire purpose is asserting `requireAuth`/`requireRole` behavior on `/protected/me`, `/protected/admin-only` — routes that no longer exist after this plan's `/protected` removal. Left in place, it would fail on every future run with 404s instead of the RBAC-relevant status codes it expects, with no path to fixing it other than re-pointing it at routes the plan didn't ask it to test.
- **Fix:** Deleted the file. Its RBAC-contract-proving purpose is already superseded by the real domain routers' own verify scripts (`kotaRoutes.verify.mjs`, `permintaanRoutes.verify.mjs`, `keputusanRoutes.verify.mjs`), which all assert the identical `requireAuth`/`requireRole` 401/403/200 contract against permanent routes — exactly the supersession the 07-02 SUMMARY's "Next Phase Readiness" note anticipated.
- **Files modified:** `server/src/middleware/rbac.verify.mjs` (deleted)
- **Verification:** Confirmed no other file imports or references `rbac.verify.mjs` or `protectedRoutes.js` before deleting (grep across `server/`); confirmed `GET /protected/me` now returns `404` live.
- **Committed in:** `b1757c2` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs/regressions directly caused by this plan's own changes, found via the plan's own mandated verification step)
**Impact on plan:** Both necessary to leave the codebase in a working, fully-green state after the plan's core changes. No scope creep beyond fixing regressions this plan's own edits caused — no new files beyond what the plan specified (plus the one new verify script the plan explicitly requested), no architectural changes.

## Issues Encountered

The Rule 1 deviations above were the only issues. Both were caught by the plan's own instruction to re-verify, not by a separate exploratory pass. No issues with the optimistic-lock + side-effect composition (Task 2's most delicate ordering requirement) — `keputusanService.race.verify.mjs` and `keputusanRoutes.verify.mjs`'s concurrent-PUT race assertions both confirmed `count200=1, count409=1` on every run, with the activity-log/notification side effects only ever attributable to the winning request (verified via `lifecycleHooks.verify.mjs`'s single-request-then-immediate-GET pattern).

## User Setup Required

None — Docker Desktop / `switera-db-1` (Postgres 16) was already running and seeded from prior phases; this plan added no migration, no new env var, no new dependency. `npx prisma migrate status` confirmed "Database schema is up to date!" both before and after this plan (no schema change — `Notifikasi`/`ActivityLog` tables already existed from Phase 6).

## Verification Evidence (beyond the plan's mandated scripts)

- **Independent manual confirmation of the specific gap the plan-checker found:** `PUT /kota/Pekanbaru` (kapasitas-only update, no rename) followed immediately by `GET /activity-log` showed the newest entry as `{"aksi":"Memperbarui data kota Pekanbaru","aktor":"admin","role":"Admin"}` — `aktor`/`role` correctly reflect the authenticated `req.user.username`/`req.user.role`, not a client-supplied value, confirming T-08-N-SPOOF's mitigation live.
- **Anomaly notification path manually exercised end-to-end:** Padang had exactly 1 prior permintaan of 20 tons (avg=20, 1.5x threshold=30). Submitting a new 50-ton permintaan for Padang produced BOTH notifications in the correct order within the single request — `"Anomali permintaan terdeteksi"` (`Permintaan kota Padang (50 ton) melebihi rata-rata historisnya (20 ton) lebih dari 50%.`) and `"Data permintaan baru"` — confirming the exact `src/store.js` formula and message template, not just the happy-path single-notification case the automated script exercises.
- `lifecycleHooks.verify.mjs` run twice consecutively, both `LIFECYCLE_HOOKS_OK true`, with a follow-up DB query confirming zero leftover test artifacts after both runs.
- Full route-level + service-level verify suite re-run clean after Task 2 (`kotaRoutes.verify.mjs`, `permintaanRoutes.verify.mjs`, `keputusanRoutes.verify.mjs`, `distribusiRoutes.verify.mjs`, `kotaService.verify.mjs`, `distribusiService.freshness.verify.mjs`, `keputusanService.race.verify.mjs`) — zero regressions from this plan's changes.

## Next Phase Readiness

- **Phase 8 (Domain CRUD Endpoints) is now complete: all 6 plans (08-01 through 08-06) executed and verified.** API-01's full 7-domain REST coverage is closed (akun via Phase 7, kota+stok via 08-02, permintaan via 08-03, keputusan+riwayatKeputusan via 08-04, notifikasi+activityLog via this plan). LOGIC-01 (08-05), LOGIC-02 (08-04), and LOGIC-03 (this plan, in full — permintaan/keputusan/kota/stok, not a subset) are all closed.
- `errorHandler` remains mounted last in `index.js`; the "keep last" comment is still accurate. The Phase 7 `/protected` throwaway router no longer exists anywhere in the codebase.
- The full REST surface (`/auth`, `/kota`, `/stok-tbs`, `/permintaan`, `/keputusan`, `/riwayat-keputusan`, `/rekomendasi-distribusi`, `/kpi`, `/notifikasi`, `/activity-log`) is ready for Phase 9 (frontend integration) to swap `src/store.js` calls for `fetch` calls against this API, one domain at a time.
- No blockers carried forward. Recommend running `gsd_run query phase.complete 8` next, then proceed to planning Phase 9.

---
*Phase: 08-domain-crud-endpoints*
*Completed: 2026-06-25*

## Self-Check: PASSED

All created files confirmed on disk: server/src/services/notifikasiService.js, server/src/services/activityLogService.js, server/src/routes/notifikasiRoutes.js, server/src/routes/activityLogRoutes.js, server/src/routes/lifecycleHooks.verify.mjs.
All commits confirmed in git log: 373f825, b1757c2.
Confirmed deleted: server/src/routes/protectedRoutes.js, server/src/middleware/rbac.verify.mjs (verified via `git status --short` showing no untracked/modified state and live 404 on GET /protected/me).
