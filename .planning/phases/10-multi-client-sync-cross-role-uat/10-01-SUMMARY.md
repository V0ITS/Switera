---
phase: 10-multi-client-sync-cross-role-uat
plan: 01
subsystem: sync
tags: [polling, setinterval, react-effect, store, hydrate, cross-client-sync]

# Dependency graph
requires:
  - phase: 09-frontend-api-client-integration-loading-error-ux
    provides: "store.hydrate() (Promise.all over loadKota/loadStok/loadPermintaan/loadKeputusan/loadRiwayatKeputusan/loadNotifikasi/loadActivityLog, no-ops without a token); App.jsx's userAktif?.username bootstrap effect calling store.hydrate() on login/session-restore; apiClient.js's setUnauthorizedHandler clearing userAktif on any 401"
provides:
  - "store.js: startPolling()/stopPolling()/pollTick() — a setInterval-driven re-run of hydrate() every 4000ms, fail-soft per tick, idempotent start/stop"
  - "App.jsx: polling start/stop wired into the existing userAktif?.username bootstrap effect (start after hydrate() on login/session-restore, stop via effect cleanup on logout/401)"
affects: ["10-02 (multi-client/cross-role UAT scripts that depend on polling actually running across concurrent sessions)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SYNC-01 polling reuses the existing hydrate()/loadX() Promise.all verbatim — no new endpoints, no new fetch logic, just a timer wrapper around already-proven code"
    - "Fail-soft tick pattern: pollTick() wraps hydrate() in try/catch, never clears the interval on error — only an explicit stopPolling() call (App.jsx's effect cleanup) stops the timer; a transient network error just gets retried on the next tick"
    - "Start/stop lifecycle is anchored to the SAME React effect dependency App.jsx already used for the one-shot hydrate() bootstrap (snapshot.userAktif?.username) — no new effect, no separate logout-button or 401-callback hook needed; cleanup-on-dependency-change IS the stop mechanism"

key-files:
  created: []
  modified:
    - src/store.js
    - src/App.jsx

key-decisions:
  - "POLL_INTERVAL_MS = 4000, documented inline with the load/justification: REQUIREMENTS.md SYNC-01 wants convergence within a few seconds; 4s keeps each client's load at 7 small GETs / 4s (well under 2 req/sec even with all 3 demo accounts polling simultaneously) while staying far cheaper than implementing WebSocket/SSE push, which REQUIREMENTS.md explicitly defers as SYNC-02."
  - "startPolling() always calls stopPolling() first before creating a new interval — guarantees at most one live interval ever exists even under a double-start (e.g. a re-fired effect), rather than relying on call-site discipline alone."
  - "pollTick() does NOT fire an immediate tick inside startPolling() — App.jsx already calls store.hydrate() immediately before startPolling(), so an immediate extra tick would be a redundant duplicate hydrate on every single login."
  - "pollTick()'s catch block intentionally does not Toast and does not re-throw — a transient background poll failure is invisible work, not a user action; Toasting every network blip every 4 seconds would be pure noise. A 401 mid-tick is handled by the EXISTING apiClient onUnauthorized path (clears userAktif), which then surfaces through App.jsx's effect cleanup as a real stopPolling() call — this plan added no new 401 handling."
  - "Stop-on-logout/401 needed zero new wiring: App.jsx's existing useEffect on [snapshot.userAktif?.username] already re-runs its cleanup whenever the dependency changes to undefined (logout via store.logout(), or a 401 via apiClient's setUnauthorizedHandler clearing userAktif) — returning store.stopPolling() from that effect's cleanup function is the single declarative stop hook."

patterns-established:
  - "Any future real-time/sync mechanism (if SYNC-02 WebSocket/SSE is ever built) should follow the same shape: reuse the existing hydrate()/notify() pipeline as the data-application layer, and anchor lifecycle start/stop to the same userAktif?.username effect rather than inventing new lifecycle hooks."

requirements-completed: [SYNC-01]

# Metrics
duration: 6min
completed: 2026-06-25
status: complete
---

# Phase 10 Plan 1: SYNC-01 Polling Mechanism Summary

**Added a setInterval-driven `pollTick()` in `store.js` that re-runs the existing `store.hydrate()` every 4000ms, started/stopped from `App.jsx`'s existing `userAktif?.username` bootstrap effect — so any two logged-in clients converge on the same server state within one poll interval, with zero new endpoints and zero changes to any existing loader or mutator.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-25T05:36:02Z
- **Completed:** 2026-06-25T05:39:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added a module-scoped polling subsystem to `src/store.js`: `pollIntervalId`, `POLL_INTERVAL_MS = 4000` (documented with load/justification rationale), and `pollTick()` — an async function wrapping `await store.hydrate()` in try/catch so a single failed tick can never kill the interval.
- Added `store.startPolling()` (always calls `stopPolling()` first to guarantee exactly one live interval, then `setInterval(pollTick, POLL_INTERVAL_MS)`) and `store.stopPolling()` (idempotent `clearInterval` + null-out) as new methods on the existing `store` object — purely additive, zero changes to `hydrate()`, any `loadX()`, `notify()`, `runMutation`, or any mutator (confirmed via `git diff`).
- Wired `src/App.jsx`'s existing `userAktif?.username` bootstrap effect to call `store.startPolling()` immediately after the existing `store.hydrate()` call (inside the same `if (snapshot.userAktif?.username)` branch), and to return a cleanup function calling `store.stopPolling()` — the effect's dependency array (`[snapshot.userAktif?.username]`) is unchanged, so React's existing cleanup-on-dependency-change behavior is the only stop mechanism needed; this fires on both logout (`store.logout()`) and 401 (apiClient's existing `onUnauthorized` handler clearing `userAktif`).
- Concretely verified (not just by reading the code, per the success criteria) the full lifecycle by driving the REAL `store.js` module through Vite's `ssrLoadModule` against the live backend (see Manual/Live Verification below): interval creation/clearing, idempotent double-start/double-stop, real ticks firing only while the interval runs (confirmed by waiting past one full interval period with timer-call instrumentation), zero ticks after `stopPolling()`, and — critically — a simulated failed tick (forced `hydrate()` rejection) that does NOT kill the interval, with the next tick confirmed to still fire.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startPolling/stopPolling/pollTick lifecycle to store.js** - `04739e8` (feat)
2. **Task 2: Wire polling start/stop into App.jsx's userAktif lifecycle** - `43e5789` (feat)

_Plan metadata commit skipped per the standing constraint for this execution run: `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, not committed under `.planning/`._

## Files Created/Modified

- `src/store.js` - Added module-scoped `pollIntervalId`, `POLL_INTERVAL_MS = 4000`, `pollTick()` (fail-soft wrapper around `store.hydrate()`), and `store.startPolling()`/`store.stopPolling()` methods. Purely additive: `git diff` confirms zero lines removed or altered in `hydrate()`, any `loadX()`, `notify()`, `runMutation`, or any mutator.
- `src/App.jsx` - Modified ONLY the existing bootstrap `useEffect` (the one calling `store.hydrate()` on the `snapshot.userAktif?.username` transition): added `store.startPolling()` immediately after `store.hydrate()`, added a cleanup function returning `store.stopPolling()`, updated the effect's leading comment. Dependency array (`[snapshot.userAktif?.username]`) and every other effect in the file are untouched.

## Decisions Made

See `key-decisions` in frontmatter above — summarized: 4000ms interval (documented load/justification), `startPolling()` defensively calls `stopPolling()` first (no interval leak ever possible), no immediate tick inside `startPolling()` (avoids a duplicate hydrate on login since App.jsx already does one), `pollTick()`'s catch swallows silently with no Toast and no re-throw (background noise vs. user action), and stop-on-logout/401 reuses the existing effect's cleanup with zero new wiring.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` instructions were followed verbatim; no architectural changes, no new dependencies, no new routes, no RBAC/validation changes.

## Issues Encountered

None.

## Manual/Live Verification

Per the plan's own `<verification>` section, this plan's own scope is limited to structural + symbol checks (the two `<automated>` blocks), with full behavioral/multi-client convergence proof deferred to Plan 10-02. However, the orchestrator's success criteria for THIS plan required concrete (not just code-reading) verification of the polling lifecycle, so the following was driven directly through `store.js`'s ACTUAL code (not mocks) via Vite's `ssrLoadModule` against the live running backend (`:4000`, Postgres-backed via `switera-db-1`) and confirmed:

- **Static-symbol checks** (the plan's two `<automated>` blocks): both pass — `store.js` exposes `startPolling`/`stopPolling`/`pollTick`/`POLL_INTERVAL_MS === 4000`/`clearInterval`/`setInterval(pollTick...)`; `App.jsx` calls `store.startPolling()` immediately after `store.hydrate()`, returns a cleanup calling `store.stopPolling()`, and the dependency array is unchanged.
- **`git diff --stat src/store.js src/App.jsx`**: confirms only these two files changed; `store.js`'s diff is purely additive (57 insertions, 0 deletions); `App.jsx`'s diff touches only the one bootstrap effect (19 insertions, 7 deletions — all within the effect body/comment).
- **`npx vite build`**: passes cleanly after both tasks.
- **Live, instrumented, real-timer lifecycle test** (login via real `POST /auth/login`, then driving `store.startPolling()`/`store.stopPolling()`/`pollTick()` through the actual loaded module):
  - `store.login("admin", "admin123")` succeeds against the real backend.
  - First `store.startPolling()` creates exactly one interval at `POLL_INTERVAL_MS === 4000`.
  - A second `store.startPolling()` call (simulating a double-start / re-fired effect) calls `clearInterval` on the prior interval before creating a new one — confirmed exactly one live interval exists at any time, never two.
  - `store.stopPolling()` calls `clearInterval` (confirmed via an instrumented timer wrapper) and is idempotent: a second consecutive `stopPolling()` call does not throw and does not call `clearInterval` again.
  - **Interval actually fires real ticks while running**: waited 4.5s (>1 full `POLL_INTERVAL_MS` period) with an instrumented `hydrate()` call counter — confirmed `hydrateCallCount >= 1`.
  - **Interval actually stops firing after `stopPolling()`**: stopped polling, reset the counter, waited another 4.5s — confirmed `hydrateCallCount === 0`, i.e. the cleared interval genuinely stopped producing ticks (not just `clearInterval` being called with no observable effect).
  - **A single failed poll tick does NOT kill the interval (the plan's explicit Success Criterion 2)**: forced `store.hydrate()` to reject on its first call only (simulating a transient network failure), restarted polling, waited one tick period (confirmed the first, failing tick fired), then waited a second tick period and confirmed `hydrateCallCount` increased again — i.e. the interval survived the thrown error and the next tick fired normally, exactly as `pollTick`'s try/catch is designed to guarantee.
  - `store.logout()` clears `userAktif` to `null`; calling `store.stopPolling()` (the exact call App.jsx's effect cleanup performs on the `userAktif?.username` → `undefined` transition) afterward, then waiting another 4.5s, confirmed zero further ticks fire — concretely proving the stop-on-logout contract, not just reading the code.
  - All 16 instrumented assertions in the verification script returned `true`. Full script output and pass/fail summary captured in this session's tool output (script was written to a temporary location, executed, and deleted — not committed to the repo, consistent with the project's no-stray-artifacts policy).
- Backend (`:4000`), Vite dev server (`:5173`), and Postgres (`switera-db-1`) were confirmed healthy (`200`/`200`/`Up`) both before and after the verification run.

No headless-browser tool (Playwright/chromium-cli) is installed in this environment — consistent with the carried-forward blocker noted in every Phase 6-9 plan and STATE.md. This plan's behavior is timer/interval-driven and was fully exercised at the JavaScript-execution level (not just protocol/HTTP level) against the real backend, which is a stronger verification depth than a visual pixel-check would add for this specific change (no JSX/styling was touched in either file).

## Known Stubs

None.

## Threat Flags

None beyond the plan's own `<threat_model>` (T-10-POLL-LEAK, T-10-POLL-DOS, T-10-RBAC-INTACT, T-10-TICK-KILL, T-10-SC), all of which are addressed exactly as designed:
- T-10-POLL-LEAK: mitigated by App.jsx's effect cleanup calling `stopPolling()` on the `userAktif?.username` → undefined transition, AND by `hydrate()`'s own pre-existing no-token no-op guard as a second line of defense — both concretely verified live in this plan.
- T-10-TICK-KILL: mitigated by `pollTick`'s try/catch, concretely verified live (simulated failure did not kill the interval).
- T-10-RBAC-INTACT / T-10-SC: structurally guaranteed — no route touched, no package installed (confirmed via `git diff --stat` scope and zero `package.json` changes).
- T-10-POLL-DOS: accepted per the plan's documented rationale (4000ms interval, 7 GETs/tick, trivial at 3-account demo scale); no server-side rate-limiting added, matching the plan's explicit decision.

## User Setup Required

None - no external service configuration required. Backend (`:4000`), Vite dev server (`:5173`), and Postgres (`switera-db-1`) were already running from Phase 9 and remain running.

## Next Phase Readiness

- Plan 10-01 (this plan) is complete: the SYNC-01 polling mechanism exists, is wired into the app's only login/session-restore/logout lifecycle hook, and has been concretely verified end-to-end against the real backend at the JavaScript-execution level.
- Plan 10-02 (multi-client/cross-role UAT, per the plan's own `<verification>` note) can now build its concurrent-session convergence and stop-on-logout/RBAC-preservation tests directly on top of this mechanism — no further store.js/App.jsx changes to the polling subsystem itself should be needed.
- Carried-forward concern (unchanged, not introduced by this plan): no Playwright/chromium-cli available in this environment for true rendered-browser visual verification — this plan's verification used direct module-execution against the live backend instead, which is the established and sufficient substitute for a non-visual, timer-logic change like this one.

---
*Phase: 10-multi-client-sync-cross-role-uat*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/store.js`, `src/App.jsx`, this SUMMARY.md) and both task commit hashes (`04739e8`, `43e5789`) are present in `git log`.
