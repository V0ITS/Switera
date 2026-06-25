---
phase: 09-frontend-api-client-integration-loading-error-ux
plan: 05
subsystem: api
tags: [rest, fetch, react, prisma, notifikasi, activity-log, hydrate, bootstrap]

# Dependency graph
requires:
  - phase: 09-frontend-api-client-integration-loading-error-ux
    provides: "src/api/apiClient.js (apiFetch), runMutation helper, hydrated-cache + Promise-returning-mutator pattern, isLoading/lastError via getState/subscribe (09-01); per-domain migration shape proven on kota/stok (09-02), permintaan (09-03), keputusan/riwayat (09-04); store.hydrate() stub introduced in 09-01"
  - phase: 08-domain-crud-endpoints
    provides: "GET/PUT /notifikasi endpoints (no POST, LOGIC-03), GET /activity-log (Admin-only, LOGIC-03), GET /rekomendasi-distribusi + GET /kpi (LOGIC-01)"
provides:
  - "store.js notifikasi/activityLog mutators (tandaiDibaca, tandaiSemuaDibaca, loadNotifikasi, loadActivityLog) backed by REST"
  - "store.js distribusi read loaders (loadRekomendasi, loadKpi) exposed for optional future use"
  - "Completed store.hydrate() — the single global bootstrap that fills every domain collection on login/session-restore"
  - "App.jsx wired to call store.hydrate() on the userAktif transition; Layout.jsx self-loads notifications on mount"
  - "RiwayatAktivitas.jsx, AnalisisRanking.jsx, Laporan.jsx wired with load-on-mount effects; Landing.jsx fixed to use static demo data (no longer reads the now-empty-pre-hydrate cache)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Final application of the 09-01 hydrated-cache pattern to the notifikasi/activityLog domain: getNotifikasi/getActivityLog stay synchronous cache reads; mutators await apiFetch then write the server's authoritative response into the cache and notify()"
    - "store.hydrate() is the single global bootstrap: Promise.all over every domain's loadX(), no-ops without a token, called once from App.jsx on the userAktif?.username transition — per-page mount loaders from 09-02..09-04 remain as a harmless idempotent belt-and-suspenders refresh"
    - "apiClient.js error objects now carry error.status (HTTP status code) in addition to error.message/error.fields — lets callers branch on status (e.g. swallow a 403) without parsing message text alone"

key-files:
  created: []
  modified:
    - src/store.js
    - src/api/apiClient.js
    - src/App.jsx
    - src/components/Layout.jsx
    - src/pages/RiwayatAktivitas.jsx
    - src/pages/AnalisisRanking.jsx
    - src/pages/Laporan.jsx
    - src/pages/Landing.jsx

key-decisions:
  - "PUT /notifikasi/:id/baca returns a SINGLE updated row (confirmed against notifikasiService.tandaiDibaca's prisma.notifikasi.update(...) return), NOT the full list the plan's action text assumed — store.js's tandaiDibaca merges the single row into the cache instead of assigning resp to state.notifikasi. PUT /notifikasi/baca-semua DOES return the full list (confirmed against tandaiSemuaDibaca's getNotifikasi() return), so that mutator's full-list-replace is correct as written."
  - "loadActivityLog swallows a 403 into an empty list using error.status === 403 as the primary check (a new field added to apiClient.js's thrown errors in this plan) with a message-text regex as a defensive fallback — relying on message-matching alone would be fragile if the server's Indonesian text ever changes."
  - "AnalisisRanking/Laporan/Dashboard remain on their existing client-side ranking computation (aggregatePermintaanRanking over the hydrated permintaan/kota/stok cache) rather than switching to GET /rekomendasi-distribusi or GET /kpi — store.loadRekomendasi()/loadKpi() are added and exposed for optional future use but deliberately NOT wired into any page, to avoid any risk of altering displayed numbers (FE-03 pixel-identical requirement)."
  - "Landing.jsx's demo widgets (ranking table + city map) switched from store.getPermintaan()/getDaftarKota() to static src/data/permintaan.json + an inlined v1.0 kotaSeed constant — Landing renders before login and must never call an authed endpoint (T-09-LAND-401), and the store's domain caches are empty pre-hydrate under the Phase 9 model, so the OLD code path was silently broken (see Deviations)."
  - "Layout.jsx's 'Reset Data' control (store.reset(), deprecated to a throwing shim in 09-01) is repurposed in this plan as a 'reload from server' affordance — async reset() now simply calls store.hydrate() again. This closes the Pending Todo carried forward since 09-01 without inventing a new server-side reset endpoint (out of scope) or removing the UI control."

patterns-established:
  - "Phase 9 is complete: all four domain plans (auth, kota/stok, permintaan, keputusan/riwayat) plus this bootstrap/notifikasi/activityLog plan apply the identical store.js mutator-conversion + page-mount-load-effect shape, verified by direct service-layer/route inspection (never assumed) before writing cache-update code, and live-verified against the real running backend, not mocks."

requirements-completed: [FE-01, FE-02, FE-03]

# Metrics
duration: 50min
completed: 2026-06-25
status: complete
---

# Phase 9 Plan 5: Bootstrap Hydration + Notifikasi/ActivityLog REST Migration Summary

**Completed store.hydrate() as the single global bootstrap (Promise.all over every domain's loadX(), wired into App.jsx on login/session-restore), converted notifikasi/activityLog to REST, and fixed a real Landing.jsx regression where the public marketing page's demo widgets had gone silently empty under the Phase 9 hydrated-cache model — closing out Phase 9 (FE-01, FE-02, FE-03) across all 12 pages.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-06-25T02:20:00Z (approx)
- **Completed:** 2026-06-25T03:10:00Z (approx)
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Converted `src/store.js`'s notifikasi/activityLog domain to REST: `getNotifikasi`/`getActivityLog` stay synchronous cache reads; `loadNotifikasi()` (GET `/notifikasi`) and `loadActivityLog()` (GET `/activity-log`, with a quiet 403-to-empty-list degrade for non-Admin sessions) added as bootstrap loaders; `tandaiDibaca`/`tandaiSemuaDibaca` converted to REST mutators (PUT `/notifikasi/:id/baca`, PUT `/notifikasi/baca-semua`) wrapped in `runMutation`.
- `tambahNotifikasi`/`catatAktivitas` converted to loud explanatory-Error shims — no client POST route exists for either (LOGIC-03: both are server-internal side effects of permintaan/keputusan/kota/stok mutations).
- Added `loadRekomendasi()`/`loadKpi()` as optional read-only loaders over `/rekomendasi-distribusi`/`/kpi` (Phase 8 LOGIC-01 ranking engine) — exposed but deliberately not wired into any page in this plan.
- **Completed `store.hydrate()`** (the 09-01 stub): no-ops without a token (T-09-H-401), otherwise runs `Promise.all` over every domain's loader (kota, stok, permintaan, keputusan, riwayatKeputusan, notifikasi, activityLog) and fires a final `notify()`.
- Repurposed `store.reset()` from 09-01's throwing shim into an async re-hydrate (`await store.hydrate()`) — closes the `Layout.jsx` "Reset Data" Pending Todo that had been carried forward since 09-01.
- Wired `App.jsx`: a new effect calls `store.hydrate()` whenever `snapshot.userAktif?.username` becomes truthy — covering both a fresh login and a session restored from `localStorage` on app-init — without re-firing on every render.
- Wired `Layout.jsx`: a mount effect calls `store.loadNotifikasi()` (Layout is always mounted for authenticated pages) so the notification badge/dropdown reflect server state independent of the global bootstrap; the notification mark-read handlers and `confirmReset` are unchanged fire-and-forget calls to the now-async store methods.
- Wired `RiwayatAktivitas.jsx` (mount-load `loadActivityLog()`), `AnalisisRanking.jsx` (mount-load `loadPermintaan()`/`loadKota()`/`loadStok()`, kept on client-side ranking computation), and `Laporan.jsx` (mount-load `loadKeputusan()`/`loadRiwayatKeputusan()`/`loadPermintaan()`) — all zero JSX/styling changes.
- **Fixed `Landing.jsx`**: switched its demo ranking/city-map widgets from `store.getPermintaan()`/`getDaftarKota()` (now empty caches pre-hydrate, since Landing never authenticates and never calls `hydrate()`) to static `src/data/permintaan.json` + an inlined v1.0 `kotaSeed` constant — Landing makes zero API calls and renders the exact same demo numbers as v1.0.
- Added `error.status` to `apiClient.js`'s thrown errors (the HTTP status code) so `loadActivityLog`'s 403-swallow can branch on status rather than message-text matching alone.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert store.js notifikasi + activityLog to REST, add distribusi loaders, complete hydrate()** - `bd1d7de` (feat)
2. **Task 2: Wire store.hydrate() into App.jsx and update Layout.jsx notification/logout/reset handlers** - `7cbad19` (feat)
3. **Task 3: Update RiwayatAktivitas, AnalisisRanking, Laporan (load-on-mount) and Landing (keep static demo)** - `780adc0` (feat)

_Plan metadata commit skipped per the standing constraint for this execution run: `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, not committed under `.planning/`._

## Files Created/Modified

- `src/store.js` - `getNotifikasi`/`getActivityLog` kept as synchronous cache reads; `loadNotifikasi`/`loadActivityLog`/`loadRekomendasi`/`loadKpi` added as bootstrap loaders; `tandaiDibaca`/`tandaiSemuaDibaca` converted to async REST mutators (written against the VERIFIED single-row/full-list response shapes, not assumed); `tambahNotifikasi`/`catatAktivitas` converted to throwing shims; `hydrate()` completed (Promise.all over every domain loader, no-ops without a token); `reset()` repurposed into a re-hydrate.
- `src/api/apiClient.js` - Added `error.status = response.status` on the thrown error object for non-2xx responses.
- `src/App.jsx` - New effect calls `store.hydrate()` on the `snapshot.userAktif?.username` transition.
- `src/components/Layout.jsx` - New mount effect calls `store.loadNotifikasi()`; `confirmReset`'s comment updated for the now-async `store.reset()`.
- `src/pages/RiwayatAktivitas.jsx` - Mount effect added calling `store.loadActivityLog()`.
- `src/pages/AnalisisRanking.jsx` - Mount effect added calling `store.loadPermintaan()`/`loadKota()`/`loadStok()`; ranking computation unchanged (still client-side via `aggregatePermintaanRanking`).
- `src/pages/Laporan.jsx` - Mount effect added calling `store.loadKeputusan()`/`loadRiwayatKeputusan()`/`loadPermintaan()`.
- `src/pages/Landing.jsx` - Demo data source switched from `store.getPermintaan()`/`getDaftarKota()` to static `src/data/permintaan.json` import + an inlined `kotaDemoSeed` constant (v1.0's exact `kotaSeed` values); `store` import removed entirely (no longer used anywhere in this file).

## Decisions Made

- **Binding correction to the plan's stated `PUT /notifikasi/:id/baca` response shape**: the plan's action text said "state.notifikasi = resp" for `tandaiDibaca`, implying a full-list response. Direct inspection of `notifikasiService.js` shows `tandaiDibaca(id)` returns `prisma.notifikasi.update(...)` — a single row — while `tandaiSemuaDibaca()` returns `getNotifikasi()` — the full list. Coded `tandaiDibaca` against the verified single-row contract (merge into cache via `.map`), confirmed live via curl (`PUT /notifikasi/:id/baca` → single object, `dibaca: true`) and through `store.js`'s actual code path via Vite's `ssrLoadModule` against the live backend.
- `loadActivityLog`'s 403-degrade checks `error.status === 403` first (a new field this plan added to `apiClient.js`) with a message-text regex (`/tidak memiliki izin/i`) as a defensive fallback, rather than relying on message-matching alone — more robust against future server message-text changes, and a small Rule 2 (missing critical functionality) fix the plan's own action text didn't spell out at the `apiClient.js` layer.
- `loadRekomendasi()`/`loadKpi()` are added as standalone, callable, but UNUSED loaders — no page in this plan was switched onto the server's ranking/KPI engine, exactly per the plan's explicit instruction to avoid any risk of altering AnalisisRanking/Laporan/Dashboard's displayed numbers (FE-03).
- `store.reset()` is repurposed (not redesigned) — calling `store.hydrate()` again is the simplest interpretation of "reset" that makes sense once the server is the sole source of truth: there is no client-side seed to revert to, but a clean reload of the authoritative server state is a meaningful, non-broken action for the "Reset Data" button to perform.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's stated `PUT /notifikasi/:id/baca` response shape ("full list") was incorrect; coded against the verified actual single-row shape instead**
- **Found during:** Task 1 implementation, before writing the live-verification script
- **Issue:** The plan's action text instructed `tandaiDibaca` to do `state.notifikasi = resp` (full-list replace), generalizing from `tandaiSemuaDibaca`'s pattern. Reading `notifikasiService.js` directly shows `tandaiDibaca(id)` returns `prisma.notifikasi.update({ where: { id }, data: { dibaca: true } })` — a single updated row, not a list. The route (`router.put("/:id/baca", ...)`) returns this single row directly as JSON.
- **Fix:** Wrote `tandaiDibaca` to merge the single returned row into `state.notifikasi` via `.map((item) => (item.id === id ? resp : item))` instead of assigning `resp` directly to `state.notifikasi`.
- **Files modified:** `src/store.js`
- **Verification:** Live curl against the real backend confirmed the exact single-object response shape (`{"id":"NTF-xxx", ..., "dibaca": true}`, not an array); re-ran through `store.js`'s actual code via Vite's `ssrLoadModule` against the live server — `store.tandaiDibaca(id)` correctly updated only the target row in the cache, leaving every other notification's `dibaca` state untouched.
- **Committed in:** `bd1d7de` (Task 1 commit)

**2. [Rule 2 - Missing critical functionality] Added `error.status` to apiClient.js so loadActivityLog's 403-degrade has a reliable status-code check, not just message-text matching**
- **Found during:** Task 1 implementation
- **Issue:** The plan's must-have truth requires `loadActivityLog` to "swallow a 403 quietly into an empty list... rather than Toasting an error," but `apiClient.js`'s thrown errors (as it existed before this plan) carried only `error.message`/`error.fields` — no HTTP status code. Implementing the 403-check via message-text matching alone (`error.message === "Anda tidak memiliki izin untuk aksi ini."`) would be fragile: any future change to the server's Indonesian error string would silently break the swallow-403 behavior and start Toasting an error on every non-Admin page load.
- **Fix:** Added one line to `apiClient.js`'s non-`response.ok` branch: `error.status = response.status;`. `loadActivityLog` now checks `error.status === 403` as the primary condition, with the message-text regex kept only as a defensive fallback.
- **Files modified:** `src/api/apiClient.js`, `src/store.js`
- **Verification:** Live test logging in as `logistik` (Tim Logistik role) and calling `store.loadActivityLog()` through the real `store.js` code against the live backend confirmed `state.activityLog` ends up as `[]` with no thrown error and no Toast fired, while an Admin session's `loadActivityLog()` populates 134 real rows.
- **Committed in:** `bd1d7de` (Task 1 commit)

**3. [Rule 1 - Bug] Landing.jsx's demo widgets were silently broken by 09-01's cache-emptying decision; fixed to use static seed data instead of the (now-empty) store cache**
- **Found during:** Task 3 implementation, before writing any code (per the plan's own explicit instruction to address this)
- **Issue:** Since 09-01, `store.getPermintaan()`/`store.getDaftarKota()` return whatever is in the in-memory cache, which starts empty and is only ever filled by `store.hydrate()` (only called for authenticated sessions). `Landing.jsx` renders BEFORE login and never calls `hydrate()` (by design — it must not call authed endpoints, T-09-LAND-401) — so since 09-01 landed, the public marketing page's ranking table and city map have been silently rendering with **zero data**, a real regression from v1.0 that nothing in 09-01 through 09-04 caught because none of those plans touched `Landing.jsx`.
- **Fix:** Per the plan's explicit instruction, replaced the two `store.getX()` calls with a static `src/data/permintaan.json` import (`aggregatePermintaanRanking(permintaanSeed)`) and an inlined `kotaDemoSeed` constant matching v1.0's exact `kotaSeed` values (verified against `git show 179b805:src/store.js`, the last pre-Phase-9 commit). The `store` import is removed entirely from `Landing.jsx` (no longer used anywhere in the file).
- **Files modified:** `src/pages/Landing.jsx`
- **Verification:** `npx vite build` passes; `git diff` confirms zero JSX/styling changes (only the import + two `useMemo` data sources changed); confirmed `src/data/permintaan.json` contains 15 rows matching the original seed data the demo ranking was always meant to show.
- **Committed in:** `780adc0` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 — bug fixes correcting a plan-text assumption against the verified actual backend contract, and fixing a real silent regression in the public marketing page; 1 Rule 2 — added a missing `error.status` field needed to reliably implement the plan's own must-have 403-degrade requirement).
**Impact on plan:** All three fixes were necessary either to match the real, already-built backend contract (deviation 1, the same kind of plan-text-vs-actual-contract gap 09-04 already documented for keputusan), to make the plan's own stated acceptance criterion actually robust (deviation 2), or to deliver on the plan's own explicit instruction to fix Landing's stale-data assumption (deviation 3, which the plan anticipated and asked for directly). No architectural deviation, no scope creep, no new dependencies.

## Issues Encountered

None beyond the deviations above.

## Manual/Live Verification

No headless-browser tool (Playwright/chromium-cli) is installed in this environment — consistent with the carried-forward blocker on STATE.md and reiterated in every prior Phase 9 plan (09-01 through 09-04). Per the project's standing policy (no ad-hoc Playwright install without explicit user approval) and Rule 3's package-install exclusion, this was deliberately NOT installed. Instead, this plan's capstone requirement — `store.hydrate()` correctly bootstrapping the cache on login/session-restore — was verified **concretely, not just by reading the code**, against the REAL running Express backend (port 4000, Postgres-backed via `switera-db-1`) and the REAL running Vite dev server (port 5173), both still running and confirmed healthy at the end of this plan:

- `POST /auth/login` (admin/admin123) → 200, JWT obtained.
- The exact 7-request burst `store.hydrate()` fires in parallel was driven directly against the live backend with the real token: `GET /kota`, `GET /stok-tbs`, `GET /permintaan`, `GET /keputusan`, `GET /riwayat-keputusan`, `GET /notifikasi`, `GET /activity-log` — **all seven returned `200`**, confirming the manual-browser-check requirement from Task 2's acceptance criteria (the devtools "burst of GET requests" on login) at the protocol level.
- **The full capstone scenario was then driven through `store.js`'s ACTUAL code** (not mocks, not curl) via Vite's `ssrLoadModule` against the live backend:
  - `store.login("admin", "admin123")` → role `"Admin"` confirmed.
  - `store.hydrate()` (the exact function `App.jsx`'s new effect calls) → after it resolved, `store.getState()` showed `daftarKota.length=8`, `stokTbs=150`, `permintaan.length=15`, `keputusan.length=3`, `riwayatKeputusan.length>0`, `notifikasi.length=59`, `activityLog.length=134` — every single collection populated from a single `hydrate()` call, exactly the "no manual refresh" requirement.
  - **A second `hydrate()` call (simulating a page refresh while a session is already restored from `localStorage`)** re-populated identically — confirming the session-restore path, not just the fresh-login path, works without any manual action.
  - **Non-Admin session test**: `store.login("logistik", "logistik123")` → role `"Tim Logistik"` → `store.hydrate()` → `activityLog` ended up `[]` with **no thrown error and no Toast fired** (confirmed by the absence of any exception propagating out of `hydrate()`'s `Promise.all`), while `daftarKota`/`permintaan` still populated normally — confirming the T-09-L-RBAC mitigation works correctly inside the parallel bootstrap, not just in isolation.
  - **`hydrate()` with no token** (after `store.logout()`) → resolved without throwing and without making any network call — confirming the T-09-H-401 no-op guard.
  - `store.tandaiSemuaDibaca()` driven through the real code against the real backend → every notification's `dibaca` flipped to `true` in both the server response and the local cache, confirmed via `state.notifikasi.every((n) => n.dibaca === true)`.
- `GET /activity-log` with a Tim Logistik token (raw curl, independent of the above) → `403 {"error":"Anda tidak memiliki izin untuk aksi ini."}` — confirms the exact message text the regex fallback in `loadActivityLog` matches, and confirms `error.status` (the new apiClient.js field) is populated as `403` for this response.
- `GET /rekomendasi-distribusi` and `GET /kpi` (Admin token) → both `200` — confirms `loadRekomendasi`/`loadKpi` would work if ever wired in.
- All eight modified files (`src/store.js`, `src/api/apiClient.js`, `src/App.jsx`, `src/components/Layout.jsx`, `src/pages/RiwayatAktivitas.jsx`, `src/pages/AnalisisRanking.jsx`, `src/pages/Laporan.jsx`, `src/pages/Landing.jsx`) build cleanly through `npx vite build` (run twice — once after Task 2, once after Task 3 — both `BUILD_OK`).
- `git diff --stat` on every page file confirms only handler-body/effect/import changes — zero JSX/styling/copy differences from the pre-existing markup in `RiwayatAktivitas.jsx`, `AnalisisRanking.jsx`, `Laporan.jsx`, `App.jsx`, `Layout.jsx`; `Landing.jsx`'s diff is reviewed line-by-line above and confirmed to be a pure data-source swap with zero rendered-markup change.

### Manual Browser-Check Result (per plan's <output> instruction, recorded for both Task 2 and Task 3)

A real rendered-browser visual check (clicking through the live app in an actual browser window — login, notification dropdown, RiwayatAktivitas, AnalisisRanking, Laporan, Landing) was **NOT performed** — no browser automation tool is installed in this environment (carried-forward blocker, unchanged since 09-01). What WAS verified, as the established structural + live-protocol substitute used by every Phase 9 plan so far:

- The exact request burst `store.hydrate()` fires on login (the devtools-visible behavior the plan's Task 2 acceptance criteria describes) was confirmed at the HTTP level: 7/7 endpoints return 200 for an Admin session.
- The notification mark-read/mark-all-read round trip was confirmed to produce real `PUT /notifikasi/...` requests against the live server and correctly update both the server's database and the client cache.
- Logout clearing the session (`userAktif === null`) and a page-refresh-equivalent re-hydrate were both confirmed via `store.js`'s actual code path, which is the same logic `App.jsx`'s `!snapshot.userAktif` redirect effect and refresh-bootstrap effect depend on.
- RiwayatAktivitas/AnalisisRanking/Laporan's mount-load effects were confirmed via `git diff` to be pure additions with zero JSX/styling change, and the data they load was confirmed live to populate the exact cache fields each page already reads via `snapshot.*`.
- Landing.jsx's fix was confirmed via `git diff` (zero JSX change) and via inspecting `src/data/permintaan.json` directly (15 rows, matching the original v1.0 demo dataset shape) plus the inlined `kotaDemoSeed` constant (verified character-for-character against `git show 179b805:src/store.js`'s pre-Phase-9 `kotaSeed`).
- This is the same verification depth as 09-01 through 09-04, which is the established and accepted standard for this milestone given the tooling gap, with one additional rigor step for this plan specifically: the capstone `hydrate()` requirement was tested as a STATEFUL scenario (login → hydrate → second hydrate → logout → no-token hydrate → re-login as a different role → hydrate) rather than as isolated per-call checks, since "bootstraps the cache correctly on login/session-restore" is inherently a sequence-dependent claim.

**Both background dev processes (Express on :4000, Vite on :5173) remain running** at the end of this plan's execution; Postgres (`switera-db-1`) also remains running. All three were re-confirmed healthy (`200`/`200`/`Up`) immediately before writing this SUMMARY.

## Known Stubs

None. `loadRekomendasi()`/`loadKpi()` are real, working loaders (verified live, `200` responses) that are simply not called by any page yet — this is a deliberate, documented scope decision (see Decisions Made), not a stub or placeholder.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-09-N-INTEGRITY, T-09-L-RBAC, T-09-LAND-401, T-09-H-401, T-09-N-SC) — no new network endpoints, auth paths, or schema changes were introduced; this plan only rewires existing Phase 8 endpoints into the client and fixes a pre-existing client-side regression in Landing.jsx.

## User Setup Required

None - no external service configuration required. (Backend/Postgres/Vite dev server already running, continued from 09-01 through 09-04.)

## Phase 9 Completion Status

**Phase 9 (Frontend API-Client Integration & Loading/Error UX) is COMPLETE.** All 5 plans executed and verified:

- 09-01: Foundational `apiClient.js` + hydrated-cache + Promise-mutator + loading/error pattern; auth (login/register/logout) converted to real JWT-backed REST.
- 09-02: kota/stok domain converted to REST (`ManajemenKota.jsx`).
- 09-03: permintaan domain converted to REST (`InputData.jsx`, `ManajemenData.jsx`, including CSV bulk-import and delete-with-undo).
- 09-04: keputusan/riwayat domain converted to REST (`KeputusanDistribusi.jsx`, `StatusDistribusi.jsx`, `Dashboard.jsx`), including the LOGIC-02 optimistic-lock 409 conflict verified live under genuine concurrency.
- 09-05 (this plan): notifikasi/activityLog domain converted to REST, distribusi read loaders added, `store.hydrate()` completed and wired into `App.jsx` as the single global bootstrap, `Layout.jsx`/`RiwayatAktivitas.jsx`/`AnalisisRanking.jsx`/`Laporan.jsx` wired, and a real Landing.jsx regression fixed.

**Requirements closed across all 12 pages:** FE-01 (every page reads/writes through the REST API), FE-02 (loading/error UX via the existing `state.isLoading`/`state.lastError` + Toast mechanism, zero new wiring per page), FE-03 (pixel-identical UI — every page's `git diff` across all five plans shows zero JSX/styling/copy changes, only handler-body logic + mount effects).

**All Pending Todos carried forward from 09-01 are now resolved:**
- ~~Layout.jsx's "Reset Data" button throws~~ — RESOLVED this plan: `store.reset()` now re-hydrates from the server.
- ~~armada/eta fields not persisted~~ — RESOLVED via quick task `260625-cvb` (before this plan started).

**One concern remains open, unchanged across all of Phase 9** (not blocking, carried into Phase 10 or milestone-close): true pixel-level browser visual regression checks have never been performed with real browser automation anywhere in the frontend across Phases 6-9, due to no Playwright/chromium-cli being available in this environment. Every plan's "pixel-identical" claim is backed by structural `git diff` review (zero JSX/styling changes) plus live functional/data verification against the real backend, not an actual rendered-browser screenshot comparison. Recommend installing Playwright (with explicit user approval — new dependency) before the v2.0 milestone ships, to finally close this out.

## Next Phase Readiness

- Phase 9 is fully complete. Phase 10 (per STATE.md's roadmap: "Backend Skeleton → Auth → Domain CRUD → Frontend Integration → Multi-Client Sync") is the next and final phase of the v2.0 milestone.
- `store.loadRekomendasi()`/`loadKpi()` exist as ready-to-use loaders if a future phase decides to switch any page onto the server-side ranking/KPI engine instead of the client-side `distribusi.js` computation — not needed for Phase 10's stated scope (multi-client sync) but available.
- The hydrated-cache + Promise-mutator + `runMutation` + `store.hydrate()` bootstrap pattern, now proven end-to-end across every domain and the global bootstrap, is the foundation Phase 10's multi-client sync work (if it adds polling/WebSocket/SSE) will build on top of — re-running `store.hydrate()` (or individual `loadX()` calls) is already the established "refresh from server" mechanism.

---
*Phase: 09-frontend-api-client-integration-loading-error-ux*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/store.js`, `src/api/apiClient.js`, `src/App.jsx`, `src/components/Layout.jsx`, `src/pages/RiwayatAktivitas.jsx`, `src/pages/AnalisisRanking.jsx`, `src/pages/Laporan.jsx`, `src/pages/Landing.jsx`, this SUMMARY.md) and all three task commit hashes (`bd1d7de`, `7cbad19`, `780adc0`) are present in `git log`.
