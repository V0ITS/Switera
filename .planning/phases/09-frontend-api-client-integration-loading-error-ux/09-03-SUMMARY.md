---
phase: 09-frontend-api-client-integration-loading-error-ux
plan: 03
subsystem: api
tags: [rest, fetch, react, prisma, permintaan]

# Dependency graph
requires:
  - phase: 09-frontend-api-client-integration-loading-error-ux
    provides: "src/api/apiClient.js (apiFetch), runMutation helper, hydrated-cache + Promise-returning-mutator pattern, isLoading/lastError via getState/subscribe (09-01); per-domain migration shape proven on kota/stok (09-02)"
  - phase: 08-domain-crud-endpoints
    provides: "GET/POST/PUT/DELETE /permintaan + GET /permintaan/duplikat endpoints with Admin RBAC, Zod validation, server-side notification + anomaly-notification + activity-log side effects (LOGIC-03)"
provides:
  - "store.js permintaan mutators (addPermintaan, updatePermintaan, removePermintaan, hasPermintaanDuplikat) backed by REST instead of in-memory/localStorage"
  - "store.loadPermintaan() bootstrap loader for 09-05's hydrate() to call"
  - "InputData.jsx and ManajemenData.jsx fully migrated to the 09-01 async/runMutation pattern, including CSV bulk-import and inline/undo edit flows"
affects: [09-04-keputusan-notifikasi, 09-05-bootstrap-hydration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-domain application of the 09-01/09-02 hydrated-cache pattern: getPermintaan stays a synchronous cache read; mutators await apiFetch, write the server's authoritative response into the cache, then notify()"
    - "hasPermintaanDuplikat converted from a synchronous client-side array scan to an async GET /permintaan/duplikat call — server is queried against live DB state, not a possibly-stale client cache"
    - "Bulk CSV import loop converted from synchronous Array.forEach to a sequential for-loop with await inside, preserving left-to-right row-order duplicate/validation/error-summary semantics exactly"
    - "Server Zod .fields errors (400 response) are caught at the page level and mapped onto the matching form field (kota/tanggalPermintaan/jumlahPermintaan), reusing the same error.fields contract apiClient.js already normalizes"

key-files:
  created: []
  modified:
    - src/store.js
    - src/pages/InputData.jsx
    - src/pages/ManajemenData.jsx

key-decisions:
  - "Removed all client-side pushNotifikasi (data + anomaly) and recordActivity calls from addPermintaan/updatePermintaan/removePermintaan — permintaanService.js (Phase 8 LOGIC-03) already performs the equivalent notification + anomaly-detection + activity-log side effects inside the same request; keeping them client-side would have produced duplicate notifications/log entries"
  - "addPermintaan's POST response is the single created row (not a full list, unlike kota's POST/PUT/DELETE which return the full collection) — store.js appends it to the cache via normalizePermintaanList([...state.permintaan, resp]) rather than replacing the whole array"
  - "hasPermintaanDuplikat is now async and queried against the server on every call site (form validation keystroke, submit, CSV row, edit-form keystroke) rather than batched/debounced — matches v1.0's per-keystroke synchronous check call pattern, accepting the same per-keystroke request volume now hitting the network instead of memory"
  - "Bulk CSV import kept strictly sequential (for-loop + await, not Promise.all) because row N's duplicate-check correctness and the error-summary's row ordering depend on rows being processed left-to-right, exactly matching v1.0's forEach order"

patterns-established:
  - "Per-domain REST migration plans converting a 'reads list + has-duplicate query + add/update/delete' shape (Task 1: store.js mutator conversion, Task 2+: page await-wiring + mount-load effect) is now proven on three consecutive domains (kota/stok, permintaan) — 09-04 (keputusan/notifikasi) can follow the identical shape"

requirements-completed: [FE-01, FE-02, FE-03]

# Metrics
duration: 30min
completed: 2026-06-25
status: complete
---

# Phase 9 Plan 3: Permintaan Domain REST Migration Summary

**store.js's permintaan mutators now call the real Phase 8 REST endpoints (GET/POST/PUT/DELETE /permintaan, GET /permintaan/duplikat), with InputData.jsx and ManajemenData.jsx awaiting them — including the CSV bulk-import loop and the delete-with-undo Toast flow — and self-loading their data on mount, zero JSX/styling change.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-25T01:50:00Z (approx)
- **Completed:** 2026-06-25T02:20:00Z (approx)
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Converted `getPermintaan`/`hasPermintaanDuplikat`/`addPermintaan`/`updatePermintaan`/`removePermintaan` in `src/store.js`: `getPermintaan` stays a synchronous cache read (zero page-level read change); `hasPermintaanDuplikat` is now async and queries `GET /permintaan/duplikat?kota=&tanggal_permintaan=&excludeId=`; the three mutators `await apiFetch(...)` against `POST/PUT/DELETE /permintaan`, each wrapped in the 09-01 `runMutation` helper.
- Added `store.loadPermintaan()` bootstrap loader (`GET /permintaan`) populating the cache `getPermintaan()` continues to read synchronously.
- Removed all client-side `pushNotifikasi`/anomaly-detection/`recordActivity` calls from the permintaan mutators — `permintaanService.js` (Phase 8 LOGIC-03) already performs the equivalent side effects inside the same request, so keeping them client-side would have produced duplicate notification/activity-log entries.
- Wired `InputData.jsx`: added a mount effect calling `store.loadPermintaan()`/`store.loadKota()`; `validate`/`handleChange`/`handleSubmit` made async and await `hasPermintaanDuplikat`/`addPermintaan`; the CSV bulk-import loop converted from `Array.forEach` to a sequential `for` loop awaiting each row's duplicate-check and `addPermintaan` call, preserving the exact left-to-right row-order/error-summary semantics of v1.0; server Zod `.fields` errors now surface on the matching form field (kota/tanggalPermintaan/jumlahPermintaan) instead of failing silently.
- Wired `ManajemenData.jsx`: added the same mount-load effect; `validateEditForm`/`handleEditChange`/`saveEdit` made async; `confirmDelete` awaits `removePermintaan` and the undo Toast's `onClick` callback now awaits `addPermintaan` to re-create the row server-side; `commitInlineEdit` (the inline jumlah quick-edit) awaits `updatePermintaan`. Server Zod field errors surface on the edit-form field; a delete failure (already Toasted by `runMutation`) closes the confirm modal instead of leaving it stuck open.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert store.js permintaan methods to REST** - `6e5111c` (feat)
2. **Task 2: Update InputData.jsx to await async permintaan methods and load on mount** - `e1ac6a3` (feat)
3. **Task 3: Update ManajemenData.jsx to await async permintaan methods and load on mount** - `e761c14` (feat)

_Plan metadata commit skipped per the standing constraint for this execution run: `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, not committed under `.planning/`._

## Files Created/Modified

- `src/store.js` - `getPermintaan` kept as a synchronous cache read; `loadPermintaan()` added as a bootstrap loader (`GET /permintaan`); `hasPermintaanDuplikat` converted to async (`GET /permintaan/duplikat`); `addPermintaan`/`updatePermintaan`/`removePermintaan` converted to async REST mutators wrapped in `runMutation`; all client-side notification/anomaly/activity-log side effects removed from this domain.
- `src/pages/InputData.jsx` - Mount effect added (`store.loadPermintaan()` + `store.loadKota()`); `validate`, `handleChange`, `handleSubmit` made async with awaits on `hasPermintaanDuplikat`/`addPermintaan`; CSV bulk-import loop converted to a sequential `for` loop with awaits, preserving v1.0's exact row-order/error-summary behavior; server field errors now mapped onto the form.
- `src/pages/ManajemenData.jsx` - Mount effect added; `validateEditForm`, `handleEditChange`, `saveEdit`, `confirmDelete`, `commitInlineEdit` made async with awaits on `hasPermintaanDuplikat`/`updatePermintaan`/`removePermintaan`/`addPermintaan` (undo-restore); server field errors mapped onto the edit form; delete-failure path closes the confirm modal.

## Decisions Made

- `addPermintaan`'s cache-update logic differs from kota/stok's full-list-replace pattern (09-02) because `POST /permintaan` returns only the single created row, not the full collection — `store.js` appends the row to the existing cache (`normalizePermintaanList([...state.permintaan, resp])`) rather than replacing the array wholesale. This is a binding shape decision for 09-04 to check against keputusan's POST response shape before assuming the same full-list-replace pattern applies there too.
- `hasPermintaanDuplikat` deliberately stayed un-debounced/un-batched at every existing call site (per-keystroke in both forms' date/kota change handlers, per-row in the CSV loop) to preserve v1.0's exact synchronous-feeling validation UX; this trades a network round-trip per keystroke for behavioral fidelity, accepted as a Phase 9 migration tradeoff (consistent with the project's school-demo-quality scope, not a production high-traffic concern).
- Bulk CSV import kept strictly sequential (not `Promise.all`) because row N's duplicate-check correctness depends on whether row N-1 in the same batch was already (or wasn't) added — `Promise.all` would race all rows' duplicate-checks against the pre-batch server state, silently admitting same-kota/same-date duplicates within one CSV file. The sequential loop closes this race and matches v1.0's `forEach` left-to-right semantics exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added try/catch + field-error mapping around store calls that the plan's action text did not explicitly spell out per-call-site**
- **Found during:** Task 2 and Task 3 implementation
- **Issue:** The plan's must-have truths require "Server-side Zod validation errors (e.g. negative tonase) surface as visible feedback, not a silent failure," but `addPermintaan`/`updatePermintaan` are wrapped in `runMutation`, which already Toasts the raw server message — without an additional page-level `try/catch`, a 400 with `.fields` (e.g. `{ jumlah_permintaan: "..." }`) would only show as a generic Toast, not on the specific form field, regressing v1.0's inline field-error UX (which showed errors under each input, not just a Toast).
- **Fix:** Added a `try/catch` around each `addPermintaan`/`updatePermintaan` await in `InputData.jsx`/`ManajemenData.jsx` that inspects `error.fields` and calls `setErrors`/`setEditErrors` with the matching field key, while still letting `runMutation`'s Toast fire (it fires before the throw reaches the page's catch). Form-reset/success-Toast/modal-close code is now inside the `try` block, after the `await`, so it only runs on success — matching the plan's explicit requirement ("Keep ... form reset AFTER the awaits so they fire only on success").
- **Files modified:** `src/pages/InputData.jsx`, `src/pages/ManajemenData.jsx`
- **Verification:** Live curl test against `POST /permintaan` with `jumlah_permintaan: -5` confirmed the exact `400 {"error":"Validasi gagal.","fields":{"jumlah_permintaan":"Jumlah permintaan harus lebih dari 0."}}` shape `error.fields.jumlah_permintaan` now maps onto `errors.jumlahPermintaan`/`editErrors.jumlahPermintaan`.
- **Committed in:** `e1ac6a3` (InputData), `e761c14` (ManajemenData)

**2. [Rule 1 - Bug] Delete-confirm modal would stay open on a removePermintaan failure**
- **Found during:** Task 3 implementation
- **Issue:** The plan's action text for `confirmDelete` only specified `await store.removePermintaan(itemDihapus.id)` without addressing what happens to `deleteTarget`/the confirm modal if that await throws (e.g. a 404 because the row was already deleted by another session, or a network error). Without handling this, the modal would remain open indefinitely with no feedback path besides the `runMutation` Toast, since the original v1.0 code had no failure path to consider (the synchronous mutator never threw).
- **Fix:** Wrapped `removePermintaan` in a `try/catch`; on failure, `setDeleteTarget(null)` closes the modal (the `runMutation` Toast already informs the user of the error) instead of leaving the dialog stuck open with no way to dismiss it via the existing UI affordances besides re-clicking "Batal".
- **Files modified:** `src/pages/ManajemenData.jsx`
- **Verification:** Code-reviewed against the existing `Modal`'s `onTutup`/"Batal" affordances; `deleteTarget=null` is the same state transition the "Batal" button already performs, so no new UI state was introduced.
- **Committed in:** `e761c14`

---

**Total deviations:** 2 auto-fixed (1 Rule 2 — missing critical functionality per the plan's own must-have truth on validation-error visibility; 1 Rule 1 — bug fix for a failure path the plan's action text did not address). Both are scoped strictly to the two pages this plan already modifies; no architectural deviation, no scope creep into other pages or domains.
**Impact on plan:** Both fixes were necessary to satisfy the plan's own must-have truth #4 ("Server-side Zod validation errors ... surface as visible feedback, not a silent failure") and to avoid introducing a new stuck-UI-state bug during the async conversion. No new dependencies, no schema changes.

## Issues Encountered

None beyond the deviations above.

## Manual/Live Verification

No headless-browser tool (Playwright/chromium-cli) is installed in this environment — consistent with the carried-forward blocker on STATE.md and reiterated in 09-01/09-02-SUMMARY.md. Per the project's standing policy (no ad-hoc Playwright install without explicit user approval) and Rule 3's package-install exclusion, this was deliberately NOT installed. Instead, the full permintaan round trip was verified live against the REAL running Express backend (port 4000, Postgres-backed via `switera-db-1`) and the REAL running Vite dev server (port 5173), both left running by 09-01/09-02:

- `POST /auth/login` (admin/admin123) → 200, JWT obtained.
- `GET /permintaan` → 200, returns the live 15-row seeded list — confirms `loadPermintaan()`'s exact request shape and the snake_case `{ id, kota, tanggal_permintaan, tanggal_input, jumlah_permintaan, keterangan }` row shape `normalizePermintaanList` expects.
- `GET /permintaan/duplikat?kota=Dumai&tanggal_permintaan=2026-06-01` (an existing row) → `{"duplikat":true}` — confirms the duplicate-block path.
- `GET /permintaan/duplikat?kota=Dumai&tanggal_permintaan=2099-01-01` (no existing row) → `{"duplikat":false}` — confirms the non-duplicate path.
- `GET /permintaan/duplikat?kota=Dumai&tanggal_permintaan=2026-06-01&excludeId=PMT-006` (excluding the row itself) → `{"duplikat":false}` — confirms `excludeId` correctly unblocks editing a row in place, matching `ManajemenData.jsx`'s edit-form duplicate check.
- `POST /permintaan` with a valid new row (`Dumai`, `2026-07-01`, 25 ton) → `201`-equivalent (200 status code returned by the route's `res.status(201)`, body confirmed), returns the single created row `{"id":"PMT-016", ...}` — confirms `addPermintaan`'s exact POST body/response shape (single row, not a full list, unlike kota's 09-02 pattern).
- `POST /permintaan` with `jumlah_permintaan: -5` → `400 {"error":"Validasi gagal.","fields":{"jumlah_permintaan":"Jumlah permintaan harus lebih dari 0."}}` — confirms the exact Zod field-error shape that `InputData.jsx`/`ManajemenData.jsx`'s new `try/catch` blocks map onto `errors.jumlahPermintaan`, satisfying must-have truth #4.
- `PUT /permintaan/PMT-016` with a partial body (`{"jumlah_permintaan":30}`) → 200, returns the updated row with only `jumlah_permintaan` changed and every other field untouched — confirms `updatePermintaan`'s partial-merge behavior matches `toDb`'s `hasOwnProperty` semantics.
- `DELETE /permintaan/PMT-016` → 200 `{"id":"PMT-016"}` — confirms `removePermintaan`'s exact DELETE response shape.
- `DELETE /permintaan/PMT-016` again (already deleted) → `404 {"error":"Data permintaan tidak ditemukan."}` — confirms the 404 path the new `confirmDelete` try/catch is designed to handle gracefully (closes the modal, relies on `runMutation`'s Toast for the message).
- `POST /permintaan` re-adding the same row with its original `id`/fields (`{"id":"PMT-016", "kota":"Dumai", ...}`) → 200, returns the recreated row identical to its pre-delete state — confirms the exact undo-restore flow `ManajemenData.jsx`'s delete-Toast `action.onClick` performs via `await store.addPermintaan(itemDihapus)`.
- Test row `PMT-016` was deleted again at the end of verification to leave demo data clean (15 rows, matching the pre-test count).
- All three modified files (`src/store.js`, `src/pages/InputData.jsx`, `src/pages/ManajemenData.jsx`) were fetched directly through the running Vite dev server (`curl http://localhost:5173/src/...`) and each returned `200 OK`, confirming they transform cleanly through the exact pipeline a real browser would use.
- `npx vite build` completes with no errors after both Task 2 and Task 3 (77 modules transformed, build succeeds in ~2.3-2.4s each run).
- `git diff --stat` on `InputData.jsx` (45 insertions/26 deletions) and `ManajemenData.jsx` (59 insertions/34 deletions) confirms only handler-body logic + two new mount `useEffect`s changed in each file — a manual line-by-line review of both diffs confirms zero JSX/styling/copy differences from the pre-existing markup, satisfying the "pixel-identical" requirement structurally.

**A literal pixel/visual comparison in an actual rendered browser window was NOT performed** (no browser automation tool available in this environment) — this is recorded as an open item carried forward from 09-01/09-02, not falsely claimed as verified. All functional/data/error-message behavior above was verified against the live server, not mocks.

**Both background dev processes (Express on :4000, Vite on :5173) remain running** at the end of this plan's execution for continuity into 09-04; they can be stopped by the operator at any time without affecting committed work.

## Known Stubs

None. No hardcoded empty/placeholder values were introduced; `permintaan` is populated from the live server response via `loadPermintaan()` on mount in both pages.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-09-P-RBAC, T-09-P-VAL, T-09-P-401, T-09-P-DUP, T-09-P-SC) — no new network endpoints, auth paths, or schema changes were introduced; this plan only rewires existing Phase 8 endpoints into the client.

## User Setup Required

None - no external service configuration required. (Backend/Postgres/Vite dev server already running, continued from 09-01/09-02.)

## Next Phase Readiness

- The permintaan domain is the second of three remaining domain migrations (09-04 keputusan/notifikasi, then 09-05 bootstrap hydration) to apply the 09-01 pattern; the Task 1 (store.js mutator conversion) + Task 2/3 (page await-wiring + mount-load effect) shape used here is directly reusable for 09-04.
- `store.loadPermintaan()` exists as a standalone callable loader, alongside `loadKota()`/`loadStok()` from 09-02; 09-05 will fold all of these into the central `store.hydrate()` bootstrap once 09-04 (keputusan/notifikasi) also converts, removing the need for each page to self-load on mount.
- New binding note for 09-04: confirm whether `POST /keputusan` returns a single created row (like permintaan) or a full list (like kota) before assuming either cache-update pattern — do not assume symmetry with either prior domain without checking `keputusanService.js`'s actual return shape first.
- Carried-forward concern (unchanged by this plan): true pixel-level browser visual regression checks still have not been performed with real browser automation anywhere in the frontend — recommend installing Playwright (with explicit user approval, since it's a new dependency) before the milestone ships, per the blocker already on STATE.md and reiterated in 09-01/09-02-SUMMARY.md.
- Carried-forward concern (unchanged by this plan): `Layout.jsx`'s "Reset demo data" control still throws (converted to a deprecated shim in 09-01) — needs a later plan to either wire a real server-side reset endpoint or remove the UI control.

---
*Phase: 09-frontend-api-client-integration-loading-error-ux*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/store.js`, `src/pages/InputData.jsx`, `src/pages/ManajemenData.jsx`, this SUMMARY.md) and all three task commit hashes (`6e5111c`, `e1ac6a3`, `e761c14`) are present in `git log`.
