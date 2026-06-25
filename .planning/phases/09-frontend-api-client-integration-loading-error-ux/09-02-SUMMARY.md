---
phase: 09-frontend-api-client-integration-loading-error-ux
plan: 02
subsystem: api
tags: [rest, fetch, react, prisma, kota, stok]

# Dependency graph
requires:
  - phase: 09-frontend-api-client-integration-loading-error-ux
    provides: "src/api/apiClient.js (apiFetch), runMutation helper, hydrated-cache + Promise-returning-mutator pattern, isLoading/lastError via getState/subscribe (09-01)"
  - phase: 08-domain-crud-endpoints
    provides: "GET/POST/PUT/DELETE /kota, GET/PUT /stok-tbs endpoints with Admin RBAC, referential-integrity block-delete, server-side activity logging (LOGIC-03)"
provides:
  - "store.js kota/stok mutators (tambahKota, updateKota, hapusKota, setStokTbs, getKotaReferenceCounts) backed by REST instead of in-memory/localStorage"
  - "store.loadKota() / store.loadStok() bootstrap loaders for 09-05's hydrate() to call"
  - "ManajemenKota.jsx fully migrated to the 09-01 async/runMutation pattern, first per-domain page proving the pattern end-to-end"
affects: [09-03-permintaan, 09-04-keputusan-notifikasi, 09-05-bootstrap-hydration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-domain application of the 09-01 hydrated-cache pattern: synchronous getDaftarKota/getKapasitasKota/getStokTbs reads stay cache-only; mutators await apiFetch, write the server's full authoritative response into the cache, then notify()"
    - "Page-level mount effect (store.loadX()) self-loads a domain's data before store.hydrate() is globally wired (09-05) — each domain plan owns its own mount-time load call"

key-files:
  created: []
  modified:
    - src/store.js
    - src/pages/ManajemenKota.jsx

key-decisions:
  - "getKotaReferenceCounts changed from a synchronous client-side filter to an async GET /kota/:nama/references call — the client no longer needs its own permintaan/keputusan arrays populated to compute this, closing a staleness gap that existed under the old client-side seed model"
  - "Client-side cascade-rename/block-delete mirroring fully removed from updateKota/hapusKota — the server (kotaService.js) is now the single integrity authority; the client only displays the server's authoritative response, eliminating a class of client/server divergence bugs"
  - "Removed recordActivity(...) calls from all kota/stok mutators — server-side catatAktivitas (Phase 8 LOGIC-03) already logs the same actions inside the same request; keeping the client-side calls would have produced duplicate activity-log entries"

patterns-established:
  - "Per-domain REST migration plans for 09-03/09-04 should follow the exact Task 1 (store.js mutator conversion) + Task 2 (page await-wiring + mount-load effect) shape established here"

requirements-completed: [FE-01, FE-02, FE-03]

# Metrics
duration: 25min
completed: 2026-06-25
status: complete
---

# Phase 9 Plan 2: Kota/Stok Domain REST Migration Summary

**store.js's kota/stok mutators now call the real Phase 8 REST endpoints (GET/POST/PUT/DELETE /kota, GET/PUT /stok-tbs), with ManajemenKota.jsx awaiting them and self-loading its data on mount — zero JSX/styling change.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-25T01:38:00Z (approx)
- **Completed:** 2026-06-25T01:47:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Converted `tambahKota`, `updateKota`, `hapusKota`, `setStokTbs` in `src/store.js` to async mutators that `await apiFetch(...)` against `/kota` and `/stok-tbs`, each wrapped in the 09-01 `runMutation` helper so failures Toast + set `lastError` + re-throw, exactly matching the auth-slice pattern.
- Added `store.loadKota()` / `store.loadStok()` bootstrap loaders (`GET /kota`, `GET /stok-tbs`) that populate the cache `getDaftarKota()`/`getStokTbs()` continue to read synchronously — no page-level read changes.
- Converted `getKotaReferenceCounts` from a synchronous client-side array filter to an async `GET /kota/:nama/references` call, since the client no longer holds a live `permintaan`/`keputusan` cache to filter against.
- Removed all `recordActivity(...)` calls from the kota/stok mutators — the server now generates the matching activity-log entry inside the same request (Phase 8 LOGIC-03), avoiding duplicate client-side log entries.
- Wired `ManajemenKota.jsx`: added a mount effect calling `store.loadKota()`/`store.loadStok()`, made `submitForm`/`requestDelete`/`confirmDelete`/`submitStock` async and `await` the now-Promise-returning store methods, with success Toast/modal-close staying strictly after the await. The existing `try/catch` mapping `error.message` onto the `nama` field is unchanged, so the server's exact Indonesian 409 messages now flow through verbatim.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert store.js kota + stok methods to REST** - `3a22e16` (feat)
2. **Task 2: Update ManajemenKota.jsx to await async kota/stok methods and load on mount** - `1f0670d` (feat)

_Plan metadata commit skipped — `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, batch-committed after Phase 10._

## Files Created/Modified

- `src/store.js` - `getDaftarKota`/`getKapasitasKota`/`getStokTbs` kept as synchronous cache reads; `tambahKota`/`updateKota`/`hapusKota`/`setStokTbs` converted to async REST mutators wrapped in `runMutation`; `getKotaReferenceCounts` converted to async; `loadKota`/`loadStok` added as bootstrap loaders; all client-side cascade-rename/block-delete/recordActivity logic removed from this domain.
- `src/pages/ManajemenKota.jsx` - Added a mount effect calling `store.loadKota()`/`store.loadStok()`; `submitForm`, `requestDelete`, `confirmDelete`, `submitStock` made async with `await` added on each store call; zero JSX/styling/copy changes (confirmed via `git diff`).

## Decisions Made

- `getKotaReferenceCounts` became async rather than trying to keep it synchronous against a (now removed) client-side `permintaan`/`keputusan` cache — the server is the only place with a live, authoritative count, so the page's `requestDelete` was changed to `await` it.
- No client-side mirroring of the server's cascade-rename (city rename propagating into `permintaan.kota`/`keputusan.kota_tujuan`/`riwayatKeputusan.kota_tujuan`) was added back — the plan explicitly calls this out as the server's responsibility (DATA-03), and the client's stale caches for those other domains will be corrected once 09-03/09-04 convert them and 09-05 wires `hydrate()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's literal `node --input-type=module` verify command cannot execute because store.js imports a `.jsx` file**
- **Found during:** Task 1 verification
- **Issue:** `src/store.js` imports `{ showToast } from "./components/Toast"` (a `.jsx` file with real JSX markup, pre-existing from 09-01). Plain Node's ESM loader cannot parse `.jsx` syntax (`Unknown file extension ".jsx"` / `ERR_MODULE_NOT_FOUND` for the extensionless `./api/apiClient` specifier), so the plan's literal verify command was not executable as written — identical root cause to a deviation already on record in 09-01-SUMMARY.md.
- **Fix:** Did not change any import (correct and required). Ran the equivalent check through Vite's `createServer({ appType: "custom" }).ssrLoadModule("/src/store.js")`, which applies the same JSX/ESM transform the real app uses, then asserted the exact same method list (`tambahKota`, `updateKota`, `hapusKota`, `setStokTbs`, `getKotaReferenceCounts`, `loadKota`, `loadStok`) the plan's verify command checks for.
- **Files modified:** None (verification-method-only deviation).
- **Verification:** Vite-harness check printed `kota/stok methods ok`. The temporary verification script was deleted from the repo after running (never committed).
- **Committed in:** N/A (verification approach only; no source change, no commit needed).

---

**Total deviations:** 1 auto-fixed (1 Rule 3 — blocking issue in verification tooling/environment gap only).
**Impact on plan:** No architectural deviation, no scope creep. The same environment limitation 09-01 already documented; this plan's fix follows the identical, already-proven workaround.

## Issues Encountered

None beyond the deviation above.

## Manual/Live Verification

No headless-browser tool (Playwright/chromium-cli) is installed in this environment — confirmed again for this plan (`grep -i playwright package.json package-lock.json` → zero matches; `npx playwright --version` resolves a registry version but is NOT present in `node_modules/.bin`, meaning invoking it would trigger a fresh install). Per the project's standing policy (carried forward from 09-01: no ad-hoc Playwright install without explicit user approval) and Rule 3's package-install exclusion, this was deliberately NOT installed. Instead, the full kota/stok round trip was verified live against the REAL running Express backend (port 4000, Postgres-backed via `switera-db-1`) and the REAL running Vite dev server (port 5173), both left running by 09-01:

- `POST /auth/login` (admin/admin123) → 200, JWT obtained.
- `GET /kota` → 200, returns the live 8-city list (Padang, Pekanbaru, Medan, Palembang, Jambi, Dumai, Bengkalis, Rokan Hilir) — confirms `loadKota()`'s exact request shape.
- `GET /stok-tbs` → 200 `{"stokTbs":150}` — confirms `loadStok()`'s exact request shape.
- `POST /kota` with a new city (`KotaUjiE2E`, 99) → 201, returns the full updated 9-city list — confirms `tambahKota`'s exact POST body and full-list-replace cache behavior.
- `POST /kota` with the same name again → `409` `{"error":"Kota dengan nama tersebut sudah ada."}` — confirms the exact Indonesian duplicate message `ManajemenKota.jsx`'s `submitForm` catch block maps onto the `nama` field.
- `PUT /kota/KotaUjiE2E` renaming to `KotaUjiE2ERenamed` with capacity 123 → 200, returns the updated full list — confirms `updateKota`'s exact PUT path/body.
- `GET /kota/KotaUjiE2ERenamed/references` → 200 `{"permintaanCount":0,"keputusanCount":0}` — confirms `getKotaReferenceCounts`'s exact request/response shape that `requestDelete` now awaits.
- `DELETE /kota/KotaUjiE2ERenamed` (unreferenced) → 200, returns the list with the test city removed — confirms `hapusKota`'s exact DELETE path and unblocked-delete path.
- `PUT /stok-tbs` with `{"stokTbs":175}` then restored to `{"stokTbs":150}` → both 200, returning `{"stokTbs": <value>}` — confirms `setStokTbs`'s exact PUT body/response shape; stock value restored to its original 150 to leave demo data clean.
- `DELETE /kota/Padang` (a REFERENCED city, 1 permintaan + 1 keputusan in the seeded data) → `409` `{"error":"Kota Padang tidak bisa dihapus karena masih digunakan oleh 1 permintaan dan 1 keputusan distribusi."}` — confirms the exact referential-block message that `requestDelete`/`blockedTarget` modal in `ManajemenKota.jsx` is designed to surface verbatim, matching v1.0 behavior (must-have truth #4 of this plan).
- `src/pages/ManajemenKota.jsx` and `src/store.js` were both fetched directly through the running Vite dev server (`curl http://localhost:5173/src/...`) and returned `200 OK`, confirming they transform cleanly through the exact pipeline a real browser would use.
- `npx vite build` completes with no errors (BUILD_OK).
- `git diff src/pages/ManajemenKota.jsx` confirms only handler-body logic + one new mount `useEffect` changed — zero JSX/styling/copy differences from the pre-existing markup, satisfying the "pixel-identical" requirement structurally.

**A literal pixel/visual comparison in an actual rendered browser window was NOT performed** (no browser automation tool installed in this environment) — this is recorded as an open item carried forward from 09-01, not falsely claimed as verified. All functional/data/error-message behavior was verified against the live server, not mocks.

**Both background dev processes (Express on :4000, Vite on :5173) remain running** at the end of this plan's execution for continuity into 09-03; they can be stopped by the operator at any time without affecting committed work.

## Known Stubs

None. No hardcoded empty/placeholder values were introduced; `daftarKota`/`stokTbs` are populated from the live server response via `loadKota()`/`loadStok()` on mount.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-09-K-RBAC, T-09-K-401, T-09-K-STALE, T-09-K-SC) — no new network endpoints, auth paths, or schema changes were introduced; this plan only rewires existing Phase 8 endpoints into the client.

## User Setup Required

None - no external service configuration required. (Backend/Postgres/Vite dev server already running, continued from 09-01.)

## Next Phase Readiness

- The kota/stok domain is the first of three remaining domain migrations (09-03 permintaan, 09-04 keputusan/notifikasi) to apply the 09-01 pattern; the Task 1 (store.js mutator conversion) + Task 2 (page await-wiring + mount-load effect) shape used here is directly reusable for those plans.
- `store.loadKota()`/`store.loadStok()` exist as standalone callable loaders; 09-05 will fold them into the central `store.hydrate()` bootstrap once all domains are converted, removing the need for each page to self-load on mount.
- Carried-forward concern (unchanged by this plan): true pixel-level browser visual regression checks still have not been performed with real browser automation anywhere in the frontend — recommend installing Playwright (with explicit user approval, since it's a new dependency) before the milestone ships, per the blocker already on STATE.md and reiterated in 09-01-SUMMARY.md.
- Carried-forward concern (unchanged by this plan): `Layout.jsx`'s "Reset demo data" control still throws (converted to a deprecated shim in 09-01) — needs a later plan to either wire a real server-side reset endpoint or remove the UI control.

---
*Phase: 09-frontend-api-client-integration-loading-error-ux*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/store.js`, `src/pages/ManajemenKota.jsx`, this SUMMARY.md) and both task commit hashes (`3a22e16`, `1f0670d`) are present in `git log`.
