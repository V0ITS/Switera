---
phase: 10-multi-client-sync-cross-role-uat
plan: 02
subsystem: testing
tags: [vite-ssrLoadModule, multi-client, polling, rbac, optimistic-lock, verify-script]

# Dependency graph
requires:
  - phase: 10-multi-client-sync-cross-role-uat (plan 01)
    provides: "store.js startPolling()/stopPolling()/pollTick() — the real SYNC-01 polling loop this plan drives through two real concurrent client sessions"
provides:
  - "server/src/sync/multiClientSync.verify.mjs — proves SYNC-01 convergence through client B's real poll tick, plus stop-halts-sync proof"
  - "server/src/sync/multiClientRbac.verify.mjs — re-proves Phase 7 POST /keputusan 403 denial holds under active dual-client polling (Success Criterion 3)"
  - "server/src/sync/multiClientRace.verify.mjs — re-proves Phase 8 LOGIC-02 exactly-one-winner concurrent-approval guarantee through two real logged-in client sessions under polling (Success Criterion 4)"
  - "A reusable cross-script pattern for driving two independent store.js client sessions under plain Node: Vite ssrLoadModule (cache-busted) + a global setInterval window-binding monkey-patch, documented in detail in multiClientSync.verify.mjs's header comment"
affects: ["v2.0 milestone close — this is the final plan of the final phase; no further phases planned in this milestone"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Driving real frontend store.js modules from a Node verify script: plain `node` ESM cannot resolve store.js's extensionless relative imports (./api/apiClient) nor parse its transitive Toast.jsx import, so all three scripts boot Vite in middleware mode purely as an in-process module loader (vite.ssrLoadModule), with no HTTP listener/port — not a new dependency, vite is already in package.json, and this exact mechanism was already used for 10-01's live verification."
    - "Cache-busting dynamic import (`ssrLoadModule('/src/store.js?client=A')` vs `?client=B`) yields two genuinely independent store singletons in one process — verified before being relied on (TWO_INDEPENDENT_CLIENTS_OK / RBAC_LOGIN_OK / RACE_LOGIN_OK style assertions in every script)."
    - "Token isolation hazard + fix: apiClient.js reads/writes window.localStorage as a plain global, not something captured per-module-instance — naively swapping globalThis.window between two clients caused a SECOND client's background poll tick to silently fire using the FIRST client's token (reproduced and confirmed during development of Task 1, before any script was finalized). Fix: monkey-patch the global setInterval before importing either store module, so every interval created via store.startPolling() permanently binds the globalThis.window value active at the moment startPolling() was called, regardless of what any other client does to globalThis.window afterward. One-off (non-timer) calls are wrapped in withWindow(win, fn), pinning globalThis.window only for that call's own await."

key-files:
  created:
    - server/src/sync/multiClientSync.verify.mjs
    - server/src/sync/multiClientRbac.verify.mjs
    - server/src/sync/multiClientRace.verify.mjs
  modified: []

key-decisions:
  - "Used Vite's programmatic ssrLoadModule (middleware-mode server, no port) instead of plain `node` dynamic import, because store.js's extensionless imports and its transitive Toast.jsx import are unresolvable/unparseable by plain Node ESM (Node removed the old --experimental-specifier-resolution=node flag) — confirmed by direct reproduction before writing any script, not assumed from the plan text."
  - "Patched the global setInterval (not a per-call window swap alone) to bind each poll timer's globalThis.window at registration time — a naive resting-window-swap approach was tested first and found to let one client's poll tick silently read another client's token, which would have been a false-pass bug baked into the verification, not a real bug in the app."
  - "Task 1 (multiClientSync): client A logs in twice — once as `manajer` to prove a genuine cross-role two-session login (LOGIN_BOTH_CLIENTS_OK), then re-logs-in as `admin` before the actual addPermintaan call, because POST /permintaan is Admin-only server-side (permintaanRoutes.js) — the plan's literal instruction to drive the mutation through the manajer/logistik pairing alone would 403. This is a Rule 1 auto-fix (plan referenced a role that does not have the route permission it assumed)."
  - "Task 2/3: roles used exactly as the plan specified (Admin/Tim Logistik for the RBAC deny+allow control; Manajer Distribusi/Tim Logistik for the race, both allow-listed on PUT /keputusan) — no RBAC-mismatch issue there, confirmed against keputusanRoutes.js before writing the scripts."
  - "All three scripts are standalone (no shared helper module extracted) — matches the plan's own one-file-per-verify convention precedent (keputusanRoutes.verify.mjs / keputusanService.race.verify.mjs each stand alone) and the plan's own suggestion that a self-contained copy per script is acceptable."

patterns-established:
  - "Any future multi-session verification script (if needed post-v2.0) should reuse the Vite ssrLoadModule + setInterval window-binding pattern documented in multiClientSync.verify.mjs's header rather than re-deriving it — the isolation hazard it avoids is non-obvious and was only found by direct reproduction."

requirements-completed: [SYNC-01]

# Metrics
duration: 32min
completed: 2026-06-25
status: complete
---

# Phase 10 Plan 2: Multi-Client SYNC-01 / RBAC / Race Verification Summary

**Three standalone Node verify scripts under `server/src/sync/` that drive TWO real concurrent `store.js` client sessions (via Vite's `ssrLoadModule` with cache-busted query strings) against the live Express backend, proving SYNC-01 convergence through the real polling loop, the Phase 7 RBAC 403 denial under active dual-client polling, and the Phase 8 LOGIC-02 exactly-one-winner race guarantee through the full client stack — all self-cleaning and re-runnable.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-06-25T05:43:53Z
- **Completed:** 2026-06-25T06:06:45Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments

- **`server/src/sync/multiClientSync.verify.mjs`** — proves SYNC-01: client A (re-logged-in as `admin`) creates a throwaway `__SYNC_VERIFY_TEMP__` permintaan; client B (logged in as `logistik`, polling via the real `store.startPolling()`/`pollTick()` from 10-01) observes it purely through its own 4000ms poll tick — no manual `loadPermintaan()` call on B — converging in ~4063-4074ms across multiple runs, well within the one-poll-interval claim. A second check (`POLL_STOPPED_OK`) proves `stopPolling()` genuinely halts sync: after stopping B's polling, a second marker mutation from A is confirmed NOT observed by B even after waiting past one full interval.
- **`server/src/sync/multiClientRbac.verify.mjs`** — re-proves the Phase 7 `POST /keputusan` 403 denial for Tim Logistik holds with BOTH client sessions (Admin + Tim Logistik) actively polling, confirming the 10-01 polling addition introduced no bypass route or relaxed `requireRole` check. An Admin positive control on the identical mutation succeeds, ruling out a false pass from an unrelated error.
- **`server/src/sync/multiClientRace.verify.mjs`** — re-proves the Phase 8 LOGIC-02 exactly-one-winner optimistic-lock guarantee, but through the FULL real client stack (two logged-in `store.js` sessions — Manajer Distribusi + Tim Logistik — calling `store.updateKeputusan`, not direct fetch/curl as in `keputusanRoutes.verify.mjs`, and not the bare service layer as in `keputusanService.race.verify.mjs`), with polling active on both sessions. Confirmed across 3 separate runs: exactly one `fulfilled` + one `rejected` every time, the rejection carries `status === 409` and the `sudah diperbarui` Indonesian message, and the final server-side state lands on `dalam-pengiriman` exactly once (no double-allocation).
- **A genuine architectural discovery, not anticipated by the plan's `<read_first>` text**: plain `node` cannot `import()` `src/store.js` directly — its extensionless relative imports (`./api/apiClient`, `./components/Toast`) are unresolvable by plain Node ESM (the old `--experimental-specifier-resolution=node` flag no longer exists in Node 22), and `Toast.jsx` is JSX Node cannot parse at all. All three scripts instead boot Vite in middleware mode (`createServer({ server: { middlewareMode: true }, appType: "custom" })`) purely as an in-process module loader via `ssrLoadModule` — the exact same mechanism 10-01's own live verification used, not a new dependency (`vite` is already in `package.json`).
- **A genuine isolation hazard found and fixed before any script was finalized**: `apiClient.js`'s `getToken()`/`setToken()` read/write `window.localStorage` as a plain mutable global — they are NOT captured per-module-instance at import time. A naive "swap `globalThis.window` then leave it" approach was directly reproduced to cause client B's background poll tick to silently read client A's token mid-test (the tick still "succeeded," because A's token was also valid — just the wrong identity — which would have been an undetected false pass baked into the verification itself). Fixed by monkey-patching the global `setInterval` *before* importing either store module: every interval created via `store.startPolling()` now permanently binds whichever `globalThis.window` was active at the moment `startPolling()` was called, for every future firing of that timer, regardless of what other client operations do to `globalThis.window` in between ticks. One-off (non-timer) calls use a `withWindow(win, fn)` helper that pins `globalThis.window` only for that call's own await. This was concretely verified standalone (both single-poller and dual-concurrent-poller cases) before being relied on in any of the three final scripts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Multi-client SYNC-01 convergence verify script driving the real polling loop** - `9f4793c` (feat)
2. **Task 2: Multi-client RBAC re-verification under polling (Success Criterion 3)** - `da6421e` (feat)
3. **Task 3: Multi-client concurrent-approval race re-verification (Success Criterion 4)** - `32c3e16` (feat)

_Plan metadata commit skipped per the standing constraint for this execution run: `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, not committed under `.planning/`._

## Files Created/Modified

- `server/src/sync/multiClientSync.verify.mjs` - Two independent `store.js` sessions (cache-busted `ssrLoadModule` import) prove SYNC-01 convergence through client B's real `pollTick()`, plus a `stopPolling()` halts-sync proof. Self-cleaning (`finally` removes every throwaway permintaan via a fresh admin-logged-in cleanup client), idempotent (re-run twice with identical PASS output, zero orphaned rows confirmed via a direct `GET /permintaan` check after both runs).
- `server/src/sync/multiClientRbac.verify.mjs` - Admin + Tim Logistik sessions, both actively polling; re-proves the `POST /keputusan` 403 denial for Tim Logistik plus an Admin-success positive control. Self-cleaning, idempotent (re-run twice, identical PASS output, zero orphaned `*VerifyTemp*` rows confirmed via `GET /keputusan`).
- `server/src/sync/multiClientRace.verify.mjs` - Manajer Distribusi + Tim Logistik sessions, both actively polling; drives `Promise.allSettled` over two concurrent `store.updateKeputusan` calls targeting the same decision and target status, re-proving LOGIC-02's exactly-one-winner guarantee through the full client stack. Self-cleaning, idempotent (re-run three times, identical PASS output every time, zero orphaned `__RACE_VERIFY_TEMP__` rows confirmed via `GET /keputusan` after all three runs).

## Decisions Made

See `key-decisions` in frontmatter above. Summarized: (1) Vite's `ssrLoadModule` (middleware-mode server, no HTTP port) is required instead of a plain `node` dynamic import, because `store.js`'s extensionless imports and its transitive `Toast.jsx` import are not resolvable/parseable by plain Node ESM — confirmed by direct reproduction, not assumed. (2) A global `setInterval` monkey-patch (binding each poll timer's `globalThis.window` at registration time) is required, not just a per-call window swap, because the swap-alone approach was directly reproduced to let one client's poll tick silently read another client's token — a false-pass risk in the verification itself. (3) Task 1's client A needed a second login as `admin` (in addition to its initial `manajer` login used only to prove the cross-role pairing) because `POST /permintaan` is Admin-only server-side, which the plan's literal `manajer`/`logistik` pairing for Task 1 did not account for — a Rule 1 auto-fix. (4) No shared helper module was extracted across the three scripts — kept consistent with the established one-file-per-verify convention precedent in the existing codebase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's client A role pairing could not actually create a permintaan as specified**
- **Found during:** Task 1 (writing `multiClientSync.verify.mjs`)
- **Issue:** The plan's Task 1 scenario logs client A in as `manajer`/`manajer123` and then has client A call `storeA.addPermintaan(...)`. `POST /permintaan` is Admin-only server-side (`server/src/routes/permintaanRoutes.js`: `requireRole("Admin")` on the POST route) — a `manajer` session would receive a 403 on this call, which is not the behavior the plan's convergence scenario intends to test (it wants the mutation to succeed so B can observe it).
- **Fix:** Client A logs in as `manajer`/`manajer123` first (satisfying `LOGIN_BOTH_CLIENTS_OK`'s literal requirement of a genuine cross-role two-session login, matching the plan's stated intent of proving two DIFFERENT real sessions), then re-logs-in as `admin`/`admin123` immediately before the actual `addPermintaan` call that the convergence assertion depends on. Documented inline in the script's `key-decisions`-equivalent comment block and in this SUMMARY.
- **Files modified:** `server/src/sync/multiClientSync.verify.mjs`
- **Verification:** Script runs clean (`RACE_SETUP_OK`-equivalent `MULTI_CLIENT_SYNC_OK true`) across two consecutive runs with zero RBAC errors.
- **Committed in:** `9f4793c` (Task 1 commit)

**2. [Rule 1 - Bug] Naive token isolation between two simulated client sessions caused a cross-client identity leak**
- **Found during:** Task 1 (designing the two-independent-client bootstrap, before any script was committed)
- **Issue:** The plan explicitly flagged this as a known risk ("the two clients share `globalThis.window.localStorage`... document whichever isolation approach is used"). A first attempt (manually swapping `globalThis.window` to the "other" client and leaving it there during a long wait) was directly reproduced to cause client B's background `setInterval`-driven poll tick to silently fire using client A's token instead of B's own — the tick still appeared to "succeed" (A's token was valid, just for the wrong role), which would have made the convergence proof pass for the wrong reason.
- **Fix:** Patched the global `setInterval` before importing any store module, so every timer created via `store.startPolling()` binds the `globalThis.window` value active at the exact moment `startPolling()` is called, and restores exactly that value for every future tick of that one timer regardless of later `globalThis.window` mutations elsewhere in the script. Verified standalone (single-poller-while-busy-elsewhere case, and both-clients-polling-concurrently case) before relying on it in any of the three final scripts.
- **Files modified:** All three `server/src/sync/*.verify.mjs` files (the same bootstrap pattern is used in each).
- **Verification:** Re-ran the originally-reproduced failure scenario after the fix and confirmed B's poll tick correctly used B's own token even while the main script flow was left pointed at A's window for an extended wait; all three final scripts' multi-run idempotency checks (2-3 runs each) confirm no token cross-contamination ever occurred in the committed scripts.
- **Committed in:** `9f4793c`, `da6421e`, `32c3e16` (all three task commits — same bootstrap pattern in each file)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs — both found and fixed before any script was committed, not after-the-fact patches)
**Impact on plan:** Both fixes were essential for the scripts to test what they claim to test, rather than silently passing for the wrong reason. No scope creep — both fixes stayed entirely within the three planned files.

## Issues Encountered

- Plain `node` dynamic `import()` of `src/store.js` fails with `ERR_MODULE_NOT_FOUND` (extensionless relative imports) and would additionally fail on the transitive `Toast.jsx` import (JSX, not parseable by plain Node) — resolved by using Vite's `ssrLoadModule` in middleware mode instead, the same mechanism already used for 10-01's live verification. This is not a deviation from the plan's intent (the plan's own text anticipated `import.meta.env` behaving differently under plain Node and discussed the implications), but it is a correction to the plan's implicit assumption that a bare `node`-level dynamic `import()` of `store.js` would work unmodified; it does not, for reasons unrelated to `import.meta.env`.

## Manual/Live Verification

Per the plan's own `<verification>` section's HONEST SCOPE note, and per the task's `<read_first>`/`<action>` text:

- **Automated, repeated, live runs** (all against the real running backend on `:4000`, Postgres-backed via `switera-db-1`, no mocks):
  - `multiClientSync.verify.mjs`: run twice, identical `MULTI_CLIENT_SYNC_OK true` output both times; convergence elapsed ~4063-4074ms (within the documented 4000ms poll interval + sub-second tick-scheduling jitter); zero orphaned `__SYNC_VERIFY_TEMP__` rows confirmed via a direct `GET /permintaan` check after both runs.
  - `multiClientRbac.verify.mjs`: run twice, identical `MULTI_CLIENT_RBAC_OK true` output both times; zero orphaned rows confirmed via `GET /keputusan`.
  - `multiClientRace.verify.mjs`: run THREE times (race conditions warrant extra confidence beyond the plan's minimum twice), identical `MULTI_CLIENT_RACE_OK true` output every time — `RACE_EXACTLY_ONE_WINNER_OK true (fulfilled=1, rejected=1)` on every single run, no flakiness observed; zero orphaned rows confirmed via `GET /keputusan` after all three runs.
  - All three scripts also run back-to-back in a single sequential pass (matching the plan's `<verification>` section's literal sequence) with no cross-script interference.
  - The plan's exact `<verify><automated>` grep-based commands for all three tasks were run independently and confirmed passing (`grep -q "..._OK true"` against each script's tail output).
- **HONEST SCOPE — NOT covered by this plan's automated scripts** (carried forward exactly as the plan's `<verification>` section instructs, and consistent with every Phase 5/9/10-01 carried-forward blocker): no Playwright/chromium-cli is available in this environment, so there is no rendered two-browser-tab pixel proof of Success Criterion 1's "without that second session reloading the page" or Success Criterion 2's idle/reopened-tab visual behavior. These three scripts prove convergence/RBAC/race correctness at the JavaScript-execution + live-HTTP level through two genuinely independent `store.js` client sessions in one Node process — a stronger behavioral proof than a visual screenshot diff would add for THIS specific change (no JSX/styling was touched by this plan), but it is explicitly NOT a substitute for an actual two-tab visual check. **A manual two-browser-tab check remains an open, recommended (not blocking) step before considering the v2.0 milestone fully UAT-closed**: open the app in two separate browser tabs/windows logged in as two different roles, make a change in one (e.g. add a permintaan as Admin), and visually confirm the other tab's UI updates within ~4 seconds with no manual refresh — this is the one verification step in this entire phase that genuinely requires a human with a browser, since no headless-browser tool was available to automate it.

## Known Stubs

None. All three scripts are fully functional end-to-end against the live backend; no placeholder/mock data paths exist in any of them.

## Threat Flags

None beyond the plan's own `<threat_model>` (T-10V-RBAC, T-10V-RACE, T-10V-LEAK, T-10V-SC), all addressed exactly as designed:
- T-10V-RBAC: mitigated — Task 2 actively re-proves the 403 denial with polling running on both clients; Admin positive control rules out a false pass.
- T-10V-RACE: mitigated — Task 3 re-proves exactly-one-winner through two real client sessions under polling, asserting the 409 shape and the single final state, confirmed stable across 3 runs.
- T-10V-LEAK: mitigated — every script creates only marker-tagged throwaway rows (`__SYNC_VERIFY_TEMP__`, `__MultiClientRbacVerifyTemp__`, `__RACE_VERIFY_TEMP__`) and removes them in a `finally` block via a dedicated cleanup client login; confirmed zero orphaned rows after every run via direct `GET` checks against the live backend.
- T-10V-SC: no new packages installed — all three scripts use only Node built-ins (`fetch`, dynamic `import` via Vite's already-present `ssrLoadModule`) and the existing `store`/`apiClient`; no Package Legitimacy Gate was needed.

## User Setup Required

None - no external service configuration required. Backend (`:4000`), Vite dev server (`:5173`), and Postgres (`switera-db-1`) were already running from Phase 9/10-01 and remain running and healthy (confirmed `200`/`200`/`Up` both before and after this plan's execution).

## Next Phase Readiness

**This is the FINAL plan of Phase 10, which is the FINAL phase of the v2.0 milestone (Backend & Multi-User Migration). There is no Phase 11.**

- SYNC-01 is now closed with executable evidence: the polling mechanism (10-01) plus this plan's convergence/stop-halts-sync proof through two real concurrent client sessions.
- Phase 10's own Success Criteria 3 (RBAC holds under polling) and 4 (LOGIC-02 race holds under polling, full client stack) are both closed with executable evidence in this plan.
- All v2.0 milestone phases (6 through 10) are now complete: Backend Skeleton & Data Model -> Auth & Authorization -> Domain CRUD Endpoints -> Frontend API-Client Integration & Loading/Error UX -> Multi-Client Sync & Cross-Role UAT.
- **Recommended next step (not blocking, not part of any open requirement): the manual two-browser-tab visual check described above in "Manual/Live Verification."** This is the one piece of Success Criteria 1/2 that could not be automated in this environment.
- **Carried-forward, still-open, non-blocking concern (unchanged across Phases 5/9/10-01/10-02)**: no Playwright/chromium-cli available in this environment for true rendered-browser visual verification across the entire v2.0 migration. Every "pixel-identical"/"no visual regression" claim and this phase's convergence claim were verified structurally and/or via live JavaScript-execution-level testing against the real backend, never via an actual rendered-browser screenshot comparison. If the project continues past v2.0, installing Playwright (with explicit user approval — new dependency) is recommended before any future UI-heavy phase ships.
- **v2.0 milestone is ready to close.** No open blockers from this plan. The only carried-forward items are the pre-existing Playwright/visual-verification gap (informational, not blocking) and the items already listed in STATE.md's "Deferred Items" table (TEST-01, SEC-01, AUTH-05/06, SYNC-02 — all explicitly deferred to a future v2 Requirements cycle, not this milestone's scope).

---
*Phase: 10-multi-client-sync-cross-role-uat*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`server/src/sync/multiClientSync.verify.mjs`, `server/src/sync/multiClientRbac.verify.mjs`, `server/src/sync/multiClientRace.verify.mjs`, this SUMMARY.md) and all three task commit hashes (`9f4793c`, `da6421e`, `32c3e16`) are present in `git log`.
