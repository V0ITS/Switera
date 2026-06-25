---
phase: 09-frontend-api-client-integration-loading-error-ux
plan: 04
subsystem: api
tags: [rest, fetch, react, prisma, keputusan, optimistic-lock, 409-conflict]

# Dependency graph
requires:
  - phase: 09-frontend-api-client-integration-loading-error-ux
    provides: "src/api/apiClient.js (apiFetch), runMutation helper, hydrated-cache + Promise-returning-mutator pattern, isLoading/lastError via getState/subscribe (09-01); per-domain migration shape proven on kota/stok (09-02) and permintaan (09-03)"
  - phase: 08-domain-crud-endpoints
    provides: "GET/POST/PUT/DELETE /keputusan + POST /keputusan/:id/restore + GET /riwayat-keputusan endpoints with Admin/Manajer/Tim Logistik RBAC, Zod validation, server-side notification + activity-log side effects (LOGIC-03), and the LOGIC-02 optimistic-lock 409 race-safety mechanism"
provides:
  - "store.js keputusan/riwayat mutators (addKeputusan, updateKeputusan, removeKeputusan, restoreKeputusan) backed by REST instead of in-memory synchronous mutation"
  - "store.loadKeputusan() / store.loadRiwayatKeputusan() bootstrap loaders for 09-05's hydrate() to call"
  - "KeputusanDistribusi.jsx, StatusDistribusi.jsx, and Dashboard.jsx (DashboardManajer + DashboardLogistik) fully migrated to the 09-01 async/runMutation pattern, including the LOGIC-02 409-safe success-after-await ordering"
affects: [09-05-bootstrap-hydration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-domain application of the 09-01/09-02/09-03 hydrated-cache pattern: getKeputusan/getRiwayatKeputusan stay synchronous cache reads; mutators await apiFetch, write the server's authoritative response into the cache, then notify()"
    - "POST/PUT/DELETE/restore on /keputusan ALL return a single row (not a full list) — confirmed directly against keputusanService.js's toApi(...) returns before writing any cache-update code, per the plan's own binding note from 09-03"
    - "LOGIC-02 409-safe ordering at the page level: success Toast / modal-close / state-reset code moved strictly after the await, inside try; catch blocks intentionally do nothing extra (runMutation's Toast already fired) and simply leave the modal open so the user sees the conflict and can retry"
    - "removeKeputusan/restoreKeputusan call store.loadRiwayatKeputusan() after their own write to pick up the server's authoritative riwayat state (status: 'dibatalkan' transition) rather than guessing the shape client-side"

key-files:
  created: []
  modified:
    - src/store.js
    - src/pages/KeputusanDistribusi.jsx
    - src/pages/StatusDistribusi.jsx
    - src/pages/Dashboard.jsx

key-decisions:
  - "DEVIATION FROM PLAN TEXT (binding correction): the plan's action text assumed DELETE /keputusan/:id and POST /keputusan/:id/restore return 'the full updated keputusan list' (kota-style). Direct inspection of keputusanService.js's removeKeputusan/restoreKeputusan shows both return toApi(existing)/toApi(created) — a SINGLE row, matching permintaan's POST response shape (09-03), not kota's full-list-replace shape. store.js was written against the verified actual contract (single-row append/filter), not the plan's stated assumption. Confirmed live via curl against the running server before writing any code."
  - "updateKeputusan never optimistically mutates the cache before the await resolves — the cache write line only executes after a successful (2xx) apiFetch response; a 409 throws inside apiFetch before reaching that line, so the losing concurrent request's cache is provably never touched. Verified live with two genuinely concurrent PUT requests against the real server: one 200, one 409 with the exact Indonesian conflict message, and the in-memory cache after both calls reflects ONLY the winner's data."
  - "All three pages' status-change/create handlers use the same ordering: validation before the await, success Toast/modal-close/state-reset strictly after the await inside try, and an empty (or Toast-already-fired) catch that leaves the modal open on failure — applied identically to KeputusanDistribusi (create/cancel/restore), StatusDistribusi (status-change), and Dashboard (DashboardManajer's handleTetapkanDistribusi, DashboardLogistik's saveStatus)."
  - "Dashboard's store.getKeputusan() synchronous cache read inside handleTetapkanDistribusi was deliberately left unchanged (no await added) per the plan's explicit instruction — it reads current in-memory state for the duplicate-active-decision guard, not a fresh server fetch."

patterns-established:
  - "Phase 9's per-domain REST migration shape (Task 1: store.js mutator conversion verified against the service-layer return shape directly, not assumed from a sibling domain; Task 2/3: page await-wiring + mount-load effect + 409/error-safe success-after-await ordering) is now proven on all four domains (kota/stok, permintaan, keputusan/riwayat) plus auth — 09-05's bootstrap hydration is the only remaining piece."

requirements-completed: [FE-01, FE-02, FE-03]

# Metrics
duration: 40min
completed: 2026-06-25
status: complete
---

# Phase 9 Plan 4: Keputusan/Riwayat Domain REST Migration Summary

**store.js's keputusan/riwayat mutators now call the real Phase 8 REST endpoints (GET/POST/PUT/DELETE /keputusan, POST /keputusan/:id/restore, GET /riwayat-keputusan), with KeputusanDistribusi.jsx, StatusDistribusi.jsx, and Dashboard.jsx awaiting them — critically, the LOGIC-02 optimistic-lock 409 conflict is surfaced as a visible Toast with the modal/form left open, never a silent failure or false success, verified live against two genuinely concurrent requests on the running server.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-06-25T02:00:00Z (approx)
- **Completed:** 2026-06-25T02:10:00Z (approx)
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Converted `getKeputusan`/`getRiwayatKeputusan`/`addKeputusan`/`updateKeputusan`/`removeKeputusan`/`restoreKeputusan` in `src/store.js`: `getKeputusan`/`getRiwayatKeputusan` stay synchronous cache reads (zero page-level read change); the four mutators `await apiFetch(...)` against `POST/PUT/DELETE /keputusan` and `POST /keputusan/:id/restore`, each wrapped in the 09-01 `runMutation` helper.
- Added `store.loadKeputusan()` / `store.loadRiwayatKeputusan()` bootstrap loaders (`GET /keputusan`, `GET /riwayat-keputusan`) populating the cache `getKeputusan()`/`getRiwayatKeputusan()` continue to read synchronously.
- **Corrected a plan-text assumption before writing code**: verified directly against `keputusanService.js` that `DELETE /keputusan/:id` and `POST /keputusan/:id/restore` both return a single row (`toApi(existing)`/`toApi(created)`), not a full list as the plan's action text assumed (it generalized from kota's full-list-replace shape). Wrote `removeKeputusan`/`restoreKeputusan` against the verified actual contract — filter/append a single row into the cache, then refresh riwayat via `loadRiwayatKeputusan()` for the server-side "dibatalkan" transition.
- Removed all client-side `pushNotifikasi`/`recordActivity` calls from the keputusan mutators — `keputusanService.js` (Phase 8 LOGIC-03) already performs the equivalent notification + activity-log side effects inside the same request.
- **THE LOGIC-02 race-safety contract**: `updateKeputusan` writes the server's response into the cache only after the await resolves successfully — never optimistically before. On a 409 (the optimistic-lock conflict), `apiFetch` throws before that write line executes, so the cache for the losing concurrent request is provably untouched. `runMutation` catches the error, sets `state.lastError`, fires an error Toast with the server's exact Indonesian conflict message (`"Status keputusan sudah diperbarui oleh proses lain. Muat ulang data dan coba lagi."`), and re-throws.
- Wired `KeputusanDistribusi.jsx`: added a mount effect calling `store.loadKeputusan()`/`loadRiwayatKeputusan()`/`loadKota()`/`loadPermintaan()`/`loadStok()` (this page computes recommendations from kota/permintaan/stok); `saveKeputusan` made async and awaits `addKeputusan`; `confirmCancelLast` made async and awaits `removeKeputusan`, with the undo Toast's `onClick` callback made async and awaiting `restoreKeputusan`. Success Toast/state-reset moved strictly after each await, inside `try`; empty `catch` blocks rely on `runMutation`'s Toast.
- Wired `StatusDistribusi.jsx`: added a mount effect calling `store.loadKeputusan()`/`loadRiwayatKeputusan()`; `saveStatus` made async, keeps the armada/ETA validation BEFORE the await, and moves the modal-close (`setSelectedKeputusan(null)`) strictly after a successful await inside `try` — on a 409 the `catch` does nothing extra (the Toast already fired) and the modal stays open with the stale form data visible, so the user sees the conflict.
- Wired `Dashboard.jsx`: added a mount effect (in the top-level `Dashboard` component) calling all five keputusan/kota/permintaan/stok loaders. `DashboardManajer`'s `handleTetapkanDistribusi` made async, keeps `store.getKeputusan()` as a synchronous cache read for the duplicate-decision guard (unchanged, per plan instruction), and awaits `addKeputusan` with the feedback message moved after the await. `DashboardLogistik`'s `saveStatus` made async with the identical 409-safe ordering as `StatusDistribusi.jsx`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert store.js keputusan + riwayat methods to REST** - `ae415b5` (feat)
2. **Task 2: Update KeputusanDistribusi.jsx to await async keputusan methods and load on mount** - `122ead8` (feat)
3. **Task 3: Update StatusDistribusi.jsx and Dashboard.jsx decision handlers to await async keputusan methods** - `1ffa434` (feat)

_Plan metadata commit skipped — `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, not committed under `.planning/`._

## Files Created/Modified

- `src/store.js` - `getKeputusan`/`getRiwayatKeputusan` kept as synchronous cache reads; `loadKeputusan`/`loadRiwayatKeputusan` added as bootstrap loaders (`GET /keputusan`, `GET /riwayat-keputusan`); `addKeputusan`/`updateKeputusan`/`removeKeputusan`/`restoreKeputusan` converted to async REST mutators wrapped in `runMutation`, written against the VERIFIED single-row response shape for DELETE/restore (not the plan's stated full-list assumption); all client-side notification/activity-log side effects removed from this domain.
- `src/pages/KeputusanDistribusi.jsx` - Mount effect added (`store.loadKeputusan()`/`loadRiwayatKeputusan()`/`loadKota()`/`loadPermintaan()`/`loadStok()`); `saveKeputusan`, `confirmCancelLast`, and the undo Toast's restore callback made async with awaits, success UI moved strictly after each await; zero JSX/styling/copy changes (confirmed via `git diff --stat`: only handler-body logic + one new mount `useEffect`).
- `src/pages/StatusDistribusi.jsx` - Mount effect added; `saveStatus` made async, awaits `updateKeputusan`, modal-close moved after the await inside `try`, catch leaves the modal open on a 409/error; zero JSX/styling/copy changes.
- `src/pages/Dashboard.jsx` - Mount effect added in the top-level `Dashboard` component; `DashboardManajer`'s `handleTetapkanDistribusi` made async (awaits `addKeputusan`, sync `getKeputusan()` read left unchanged); `DashboardLogistik`'s `saveStatus` made async with the identical 409-safe ordering as `StatusDistribusi.jsx`; zero JSX/styling/copy changes.

## Decisions Made

- **Binding correction to the plan's stated DELETE/restore response shape**: the plan's action text described DELETE/restore as returning "the full updated keputusan list," generalizing from kota's pattern (09-02). Direct inspection of `keputusanService.js` (the binding contract per the plan's own `<read_first>` instruction) shows both `removeKeputusan`/`restoreKeputusan` return `toApi(existing)`/`toApi(created)` — a single row, matching permintaan's shape (09-03) instead. Coding against the plan's stated (incorrect) assumption would have broken the cache update (treating a single object as if it were an array). This was caught BEFORE writing code by reading the service file and confirmed again live via curl against the running server.
- `removeKeputusan`/`restoreKeputusan` both call `store.loadRiwayatKeputusan()` after their own single-row write, rather than attempting to mirror the server's "dibatalkan" transition client-side — this exactly matches the plan's T-09-D-STALE threat mitigation and the established pattern from prior plans (server is the sole authority for derived/transitioned state).
- The LOGIC-02 409-safe ordering (validate → await → success-UI-strictly-after → empty/no-op catch that leaves the modal open) was applied identically across all three status-change-capable call sites (`StatusDistribusi.jsx`'s `saveStatus`, `Dashboard.jsx`'s `DashboardLogistik.saveStatus`, and indirectly `KeputusanDistribusi.jsx`'s create/cancel/restore flows) rather than inventing per-page variations — consistent with the plan's explicit instruction to keep this binding across both consuming pages.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's stated DELETE/restore response shape ("full list") was incorrect; coded against the verified actual single-row shape instead**
- **Found during:** Task 1 implementation, before writing any code
- **Issue:** The plan's action text instructed: "the server returns the full updated keputusan list — set state.keputusan = resp" for both `removeKeputusan` and `restoreKeputusan`. Reading `keputusanService.js` directly (as the plan's own `<read_first>` section instructs) shows `removeKeputusan` returns `toApi(existing)` and `restoreKeputusan` returns `toApi(created)` — both single objects, not arrays. The route handlers (`keputusanRoutes.js` lines 72-96) confirm this: `res.status(200).json(keputusan)` / `res.status(201).json(keputusan)` where `keputusan` is the single-row return value from the service function, with no list-fetch anywhere in either code path.
- **Fix:** Wrote `removeKeputusan` to filter the cancelled id out of `state.keputusan` (matching the pre-existing client-side filter logic, now triggered by a confirmed server response rather than blindly) and `restoreKeputusan` to append the single returned row to `state.keputusan`, instead of assigning `resp` directly to `state.keputusan`. Both then call `store.loadRiwayatKeputusan()` to pick up the server's authoritative riwayat state, exactly as the plan also specified for the riwayat side.
- **Files modified:** `src/store.js`
- **Verification:** Live curl test against the running server: `DELETE /keputusan/KPT-352` returned a single object (not an array); `POST /keputusan/KPT-352/restore` returned a single object with `status: 201`. Re-ran the same calls through `store.js` via Vite's `ssrLoadModule` against the live backend — `store.removeKeputusan`/`store.restoreKeputusan` both resolved correctly and the cache ended up with the correct single-row state (confirmed via `store.getState().keputusan`).
- **Committed in:** `ae415b5` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 — bug fix correcting the plan's own stated API contract against the verified actual backend code, caught before any code was written against the wrong assumption).
**Impact on plan:** This was the exact risk the plan itself flagged in its `<read_first>` instructions ("confirm whether keputusan's POST response is a single row... or a full list... before assuming either pattern" — a binding note carried forward from 09-03-SUMMARY.md). The plan's own action-text prose for DELETE/restore did not follow that same caution and stated the wrong shape; this deviation is the direct, correct application of that carried-forward caution. No architectural deviation, no scope creep — purely a correction to match the real, already-built backend contract.

## Issues Encountered

None beyond the deviation above.

## Manual/Live Verification

No headless-browser tool (Playwright/chromium-cli) is installed in this environment — consistent with the carried-forward blocker on STATE.md and reiterated in 09-01/02/03-SUMMARY.md. Per the project's standing policy (no ad-hoc Playwright install without explicit user approval) and Rule 3's package-install exclusion, this was deliberately NOT installed. Instead, the full keputusan/riwayat round trip — including the highest-risk LOGIC-02 concurrency scenario — was verified live against the REAL running Express backend (port 4000, Postgres-backed via `switera-db-1`) and the REAL running Vite dev server (port 5173), both left running by prior plans:

- `POST /auth/login` (admin/admin123) → 200, JWT obtained.
- `GET /keputusan` → 200, returns the live 3-row active-decision list in the exact snake_case shape `loadKeputusan()` expects.
- `GET /riwayat-keputusan` → 200, returns the live history list including prior plans' test-cleanup rows (e.g. `__KeputusanRoutesVerifyTemp__` entries from 08-04's own verification), confirming `loadRiwayatKeputusan()`'s exact request shape.
- `POST /keputusan` with a new decision (`Dumai`, 15 ton, `menunggu`) → 200-status JSON, returns the SINGLE created row `{"id":"KPT-352", ...}` — confirms `addKeputusan`'s exact POST body/response shape (single row, matching permintaan's 09-03 pattern, not kota's full-list pattern).
- **THE CRITICAL TEST — two genuinely concurrent `PUT /keputusan/:id` requests** (fired via backgrounded `curl` processes targeting the same `menunggu -> dalam-pengiriman` transition on the same row) → one returned `200` with the updated row (`status: "dalam-pengiriman"`), the other returned **`409` with the exact Indonesian conflict message** `{"error":"Status keputusan sudah diperbarui oleh proses lain. Muat ulang data dan coba lagi."}`. This confirms the optimistic-lock mechanism (LOGIC-02) functions correctly under genuine concurrent load against the live Postgres-backed server.
- **Same concurrency scenario driven through the actual `store.js` code** (not just raw curl) via Vite's `ssrLoadModule` against the live backend: `Promise.allSettled([store.updateKeputusan(id, {...}), store.updateKeputusan(id, {...})])` resolved with exactly one `fulfilled` (status updated) and one `rejected` with `reason.message === "Status keputusan sudah diperbarui oleh proses lain. Muat ulang data dan coba lagi."` (exact string match confirmed). The in-memory cache (`store.getState().keputusan`) after both calls settled reflected ONLY the winning request's data — the losing request's cache write never happened, confirming the "never a false success" requirement at the store layer, not just the HTTP layer.
- `DELETE /keputusan/:id` (cancel) → single-row response with `status: 200`, confirming the corrected (non-full-list) cache-update logic in `removeKeputusan`.
- `POST /keputusan/:id/restore` with a body whose `id` matches the path → single-row response with `status: 201`, confirming `restoreKeputusan`'s corrected cache-update logic and the route's id-matching guard.
- RBAC spot-check: a `Tim Logistik`-role JWT attempting `POST /keputusan` → `403 {"error":"Anda tidak memiliki izin untuk aksi ini."}`, confirming write-role gating is enforced server-side independent of UI gating (T-09-D-RBAC); the same token successfully reaches the PUT status-change path (gated by role but not blocked outright — it returned a 409 in this specific test only because the target row was already at the requested status, a TOCTOU-guard rejection, not an RBAC rejection).
- `GET /kota`, `GET /permintaan`, `GET /stok-tbs` (the other mount-effect calls added to `KeputusanDistribusi.jsx`/`Dashboard.jsx`) all returned 200 with the expected shapes (8 cities, 15 permintaan rows, `stokTbs: 150`), confirming the mount-effect cascade doesn't error.
- All four modified files (`src/store.js`, `src/pages/KeputusanDistribusi.jsx`, `src/pages/StatusDistribusi.jsx`, `src/pages/Dashboard.jsx`) were fetched directly through the running Vite dev server (`curl http://localhost:5173/src/...`) and each returned `200 OK`, confirming they transform cleanly through the exact pipeline a real browser would use.
- `npx vite build` completes with no errors after each task (BUILD_OK each time).
- `git diff --stat` on all three page files confirms only handler-body logic + new mount `useEffect`s changed in each — zero JSX/styling/copy differences from the pre-existing markup, satisfying the "pixel-identical" requirement structurally.
- All test decisions created during verification (`KPT-352`, `KPT-353`, `KPT-354`) were cancelled/cleaned up at the end of verification to leave demo data in its baseline state (3 active decisions, matching the pre-test count).

**A literal pixel/visual comparison in an actual rendered browser window was NOT performed** (no browser automation tool available in this environment) — this is recorded as an open item carried forward from 09-01/02/03, not falsely claimed as verified. All functional/data/error-message/concurrency behavior above was verified against the live server and the live store.js code path, not mocks.

**Both background dev processes (Express on :4000, Vite on :5173) remain running** at the end of this plan's execution for continuity into 09-05; they can be stopped by the operator at any time without affecting committed work.

### Manual Browser-Check Result (per plan's <output> instruction)

A real rendered-browser visual check (clicking through KeputusanDistribusi, StatusDistribusi, and Dashboard in an actual browser window) was NOT performed — no browser automation tool is installed in this environment (carried-forward blocker, unchanged since 09-01). What WAS verified, as a structural substitute:
- `git diff --stat` confirms zero JSX/styling/copy changes in all three pages — only handler bodies and new mount effects changed.
- All three pages' exact source transform cleanly through the live Vite dev server (200 OK on direct fetch).
- The full data round-trip (create/cancel/restore/status-change, including the 409 conflict) was driven through the real backend and the real store.js code, producing the exact request/response shapes the UI code reads.
- This is the same verification depth as 09-01/02/03, which is the established and accepted standard for this milestone given the tooling gap.

## Known Stubs

None. No hardcoded empty/placeholder values were introduced; `keputusan`/`riwayatKeputusan` are populated from the live server response via `loadKeputusan()`/`loadRiwayatKeputusan()` on mount in all three consuming pages.

## Threat Flags

| Flag | File | Description |
|------|------|--------------|
| threat_flag: data-loss-regression | src/pages/StatusDistribusi.jsx, src/pages/Dashboard.jsx | `armada`/`eta` fields (truck/driver name + estimated arrival date), entered by the user in the "Dalam Pengiriman" status-change modal and displayed in the "Armada / ETA" table column, are NOT persisted by the Phase 6/8 backend schema. `keputusanService.js`'s `toApi()`/`toDb()` mapping and the Prisma `Keputusan`/`RiwayatKeputusan` models (server/prisma/schema.prisma) have no `armada`/`eta` columns at all — confirmed via direct schema inspection and a live PUT round-trip (the field is silently dropped, never echoed back in the response). This means that after this plan's migration, the armada/ETA validation still correctly GATES the status change (client-side form validation, unchanged), but the truck/ETA info the user enters is discarded server-side and the "Armada / ETA" column will permanently show "-" for every decision after a page reload or fresh `loadKeputusan()` fetch — a real, user-visible regression versus v1.0 (where this data lived in the client-side in-memory/localStorage object and persisted across reloads in the same browser). This is a pre-existing Phase 6/8 backend schema gap (the Prisma schema was designed without these two fields), not something introduced by this plan's code, and it is NOT fixable within this plan's file scope (`src/store.js` + 3 page files) — a fix requires a Prisma schema migration (`ALTER TABLE` adding `armada`/`eta` columns to both `Keputusan` and `RiwayatKeputusan`) plus updates to `toApi`/`toDb`/`keputusanCreateSchema`/`keputusanUpdateSchema` in `server/`, which is an architectural change (Rule 4) outside this frontend-only plan's scope. Flagged here rather than silently shipped; tracked as a Pending Todo below for a follow-up plan (likely a small Phase 8 patch plan, or folded into Phase 10) to add the migration before the milestone ships. |

## User Setup Required

None - no external service configuration required. (Backend/Postgres/Vite dev server already running, continued from 09-01/02/03.)

## Next Phase Readiness

- The keputusan/riwayat domain is the last of the four domain migrations (auth, kota/stok, permintaan, keputusan/riwayat) needed before 09-05 (bootstrap hydration) can fold all five `loadX()` functions (`loadKota`, `loadStok`, `loadPermintaan`, `loadKeputusan`, `loadRiwayatKeputusan`) into a single central `store.hydrate()` call and remove the need for each page to self-load on mount.
- 09-05 should also decide what to do about `notifikasi`/`activityLog` reads (this plan did not touch them — they were already noted as out of scope per the 09-04-PLAN.md objective, which only covers keputusan + riwayatKeputusan, not notifikasi/activityLog as the plan filename might suggest).
- **New blocker for follow-up (see Threat Flags above)**: `armada`/`eta` are not persisted by the backend schema — the status-change modal's truck/ETA inputs are silently discarded server-side. This is a real regression from v1.0 that needs a small Phase 8-style schema-migration plan before the milestone ships, independent of and not blocking 09-05.
- Carried-forward concern (unchanged by this plan): true pixel-level browser visual regression checks still have not been performed with real browser automation anywhere in the frontend — recommend installing Playwright (with explicit user approval, since it's a new dependency) before the milestone ships, per the blocker already on STATE.md and reiterated in every Phase 9 plan so far.
- Carried-forward concern (unchanged by this plan): `Layout.jsx`'s "Reset demo data" control still throws (converted to a deprecated shim in 09-01) — needs a later plan to either wire a real server-side reset endpoint or remove the UI control.

---
*Phase: 09-frontend-api-client-integration-loading-error-ux*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/store.js`, `src/pages/KeputusanDistribusi.jsx`, `src/pages/StatusDistribusi.jsx`, `src/pages/Dashboard.jsx`, this SUMMARY.md) and all three task commit hashes (`ae415b5`, `122ead8`, `1ffa434`) are present in `git log`.
