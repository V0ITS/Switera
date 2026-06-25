---
phase: 09-frontend-api-client-integration-loading-error-ux
plan: 01
subsystem: auth
tags: [jwt, fetch, react, express, bearer-token, localStorage]

# Dependency graph
requires:
  - phase: 07-auth-authorization
    provides: "POST /auth/login and POST /auth/register endpoints, requireAuth Bearer-JWT middleware"
  - phase: 08-domain-crud-endpoints
    provides: "validate() Zod 400 shape and errorHandler status-mapping that apiClient's error normalization parses"
provides:
  - "src/api/apiClient.js — the single fetch wrapper every later plan (09-02..09-05) calls"
  - "Hydrated in-memory cache + Promise-returning-mutator pattern in store.js (binding for 09-02..09-05)"
  - "JWT storage decision (localStorage key switera_token) and loading/error UX mechanism (state.isLoading/state.lastError via existing getState/subscribe)"
  - "store.login/store.register/store.logout backed by the real Phase 7 endpoints"
  - "store.hydrate() stub for 09-05 to complete"
affects: [09-02-kota-stok, 09-03-permintaan, 09-04-keputusan-notifikasi, 09-05-bootstrap-hydration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hydrated in-memory cache: synchronous getters read from a cache object; mutators await apiFetch then write the server's authoritative response into the cache and notify()"
    - "Mutators return Promises; call sites add a minimal await where v1.0 already ran follow-up code after the call"
    - "runMutation(fn) helper: catches a thrown apiFetch error, sets state.lastError, fires a Toast, notify()s, re-throws so page-level try/catch still maps field errors"
    - "apiClient never imports store.js or Toast.jsx (avoids import cycles); store registers callbacks via setUnauthorizedHandler/subscribeLoading"

key-files:
  created:
    - src/api/apiClient.js
  modified:
    - src/store.js
    - src/pages/Login.jsx
    - src/pages/Register.jsx

key-decisions:
  - "JWT stored in localStorage under switera_token (plaintext-localStorage pattern consistent with v1.0's userAktif storage; XSS-exposure tradeoff accepted for this school-demo milestone, per threat model T-09-JWT)"
  - "persistState() now writes ONLY {userAktif, tema} under a new key switera_session_v2 — the old switera_state_v1 domain blob is no longer written; all domain collections (daftarKota, permintaan, keputusan, riwayatKeputusan, notifikasi, activityLog, stokTbs) initialize empty/0 pending store.hydrate() (09-05)"
  - "Login no longer sends role as a credential — the server returns the account's real role from username+password; the role pill stays a UI affordance only"
  - "Server returns one generic 401 for unknown-user/wrong-password/wrong-role (T-07-ENUM); Login.jsx no longer inspects credentials client-side — the v1.0 per-field username/password/role breakdown is intentionally dropped and replaced with a single password-field error"
  - "cariAkun, tambahAkun, getNextAkunId, and reset() are deprecated into loud explanatory-Error shims rather than silently no-op'ing or operating on stale/empty client data"

patterns-established:
  - "Every later Phase 9 plan reuses apiFetch + the hydrated-cache + Promise-mutator pattern verbatim — no plan reinvents loading/error/401 handling"

requirements-completed: [FE-01, FE-02, FE-03]

# Metrics
duration: 35min
completed: 2026-06-25
status: complete
---

# Phase 9 Plan 1: Store-as-Seam Auth Foundation Summary

**Shared apiClient fetch wrapper + hydrated in-memory cache pattern in store.js, with Login/Register now calling the real Phase 7 JWT endpoints instead of client-side plaintext matching.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-06-25T01:02:00Z (approx, session start)
- **Completed:** 2026-06-25T01:37:53Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Created `src/api/apiClient.js`: the one fetch wrapper for the whole frontend — attaches `Authorization: Bearer <token>`, normalizes server errors (including Zod `fields`), handles 401 by clearing the token and invoking a registered unauthorized handler, and exposes an in-flight request counter via `subscribeLoading`/`isLoading`.
- Converted `store.js`'s auth path to real REST calls: `login`/`register` POST to `/auth/login`/`/auth/register`; `state.isLoading`/`state.lastError` are now exposed through the existing `getState()`/`subscribe()` contract with zero new wiring required by any page.
- `persistState()` now persists only the session (`userAktif`, `tema`) under `switera_session_v2` — the v1.0 domain blob (`switera_state_v1`) is retired; domain collections are cache-only, pending `store.hydrate()` (09-05).
- Wired `Login.jsx`/`Register.jsx` to the new async `store.login`/`store.register` methods with zero JSX/styling changes — only handler bodies changed.
- `cariAkun`/`tambahAkun`/`getNextAkunId`/`reset()` converted to loud, explanatory-Error shims so any missed caller fails fast instead of silently operating on stale/empty client state.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/api/apiClient.js shared fetch wrapper** - `b91cdc5` (feat)
2. **Task 2: Convert store.js auth + add cache/loading/error/hydrate infrastructure** - `56ee400` (feat)
3. **Task 3: Wire Login.jsx and Register.jsx to async store auth, preserving exact UI/copy** - `dd53215` (feat)

_Plan metadata commit skipped — `.planning/config.json` has `commit_docs: false` as a deliberate temporary override for Phases 6-10; SUMMARY.md/STATE.md are written to disk only, batch-committed after Phase 10._

## Files Created/Modified

- `src/api/apiClient.js` - New shared fetch wrapper: `apiFetch`, `getToken`/`setToken`/`clearToken`, `setUnauthorizedHandler`, `subscribeLoading`/`isLoading`. No import of store.js or Toast.jsx (verified by grep, zero matches).
- `src/store.js` - Auth methods (`login`, `register`, `logout`, `setUserAktif`) converted to call the real API; `state.isLoading`/`state.lastError` added to the cache; `persistState`/state-init rewritten for the new session-only `switera_session_v2` key; `runMutation` helper added; `hydrate()` stub introduced; `cariAkun`/`tambahAkun`/`getNextAkunId`/`reset` converted to explanatory-Error shims.
- `src/pages/Login.jsx` - `handleSubmit` is now async, calls `store.login(username, password)`, maps the server's single generic 401 onto the password field.
- `src/pages/Register.jsx` - `handleSubmit` is now async, calls `store.register({...})`; removed the client-side duplicate-username pre-check (no longer has visibility into the full account list); maps the server's 409 "Username sudah digunakan." onto the username field.

## Decisions Made

- JWT storage in `localStorage` under `switera_token` (binding, see threat model T-09-JWT) — consistent with the project's existing plaintext-localStorage session pattern; httpOnly-cookie/refresh-token hardening explicitly deferred to AUTH-05/06 (v2 REQUIREMENTS.md, already on record).
- `switera_session_v2` replaces `switera_state_v1`; only `userAktif` + `tema` survive a refresh client-side, all domain data is server-sourced from now on.
- Login drops the v1.0 per-field credential-mismatch breakdown (username-not-found / wrong-password / wrong-role) in favor of a single password-field message, because the server's anti-enumeration design (T-07-ENUM) only returns one generic 401 — re-introducing a client-side breakdown would require re-inspecting credentials client-side, which no longer has data to inspect and would reopen an enumeration oracle.
- `reset()` (Layout.jsx's "reset demo data" button) is out of this plan's scope to redesign (auth-only plan); converted to an explanatory shim rather than left silently broken. Flagged below for a later domain plan to either wire a real server-side reset endpoint or remove the UI control.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `import.meta.env` guarded with optional chaining in apiClient.js**
- **Found during:** Task 1 verification
- **Issue:** The plan's own automated verify command runs `apiClient.js` under plain `node --input-type=module`, where `import.meta.env` is `undefined` (Vite-only global) — accessing `.VITE_API_BASE_URL` on it threw `TypeError: Cannot read properties of undefined`, so the plan's literal verify command would never pass as written.
- **Fix:** Changed `import.meta.env.VITE_API_BASE_URL` to `import.meta.env?.VITE_API_BASE_URL`. Behavior under real Vite (browser/dev/build) is unchanged — `import.meta.env` is always defined there.
- **Files modified:** `src/api/apiClient.js`
- **Verification:** Re-ran the plan's exact verify command — passes (`exports ok`).
- **Committed in:** `b91cdc5` (Task 1 commit)

**2. [Rule 3 - Blocking] `store.js`'s `reset()` referenced now-removed seed imports**
- **Found during:** Task 2 implementation
- **Issue:** The plan's instruction to stop seeding domain collections client-side (`daftarKota`, `permintaan`, `keputusan`, `notifikasi`, `activityLog` now init empty) left `store.reset()` (used by `Layout.jsx`'s "reset demo data" control) referencing deleted seed constants (`permintaanSeed`, `keputusanSeed`, `notifikasiSeed`, `activityLogSeed`) — the file would throw `ReferenceError` on load, breaking every page, not just auth.
- **Fix:** Converted `reset()` into the same kind of loud explanatory-Error shim used for `cariAkun`/`tambahAkun`, consistent with the plan's own established pattern for deprecated client-side-only methods. Out of scope for this auth-only plan to design a real server-side reset endpoint.
- **Files modified:** `src/store.js`
- **Verification:** Confirmed via grep that no dangling references to the removed seed constants remain; store.js loads cleanly via Vite SSR module load.
- **Committed in:** `56ee400` (Task 2 commit)

**3. [Rule 3 - Blocking] Task 2's literal `node --input-type=module` verify command cannot succeed once store.js imports a `.jsx` file**
- **Found during:** Task 2 verification
- **Issue:** The plan instructs `store.js` to import `{ showToast } from "./components/Toast"` (a `.jsx` file containing real JSX markup). Plain Node's ESM loader cannot parse `.jsx` syntax (`Unknown file extension ".jsx"`), so the plan's literal verify command for Task 2 was not executable as written, independent of any code defect.
- **Fix:** Did not change the import (it is correct and required by the plan). Instead ran the equivalent verification through Vite's `createServer({ appType: 'custom' }).ssrLoadModule(...)`, which applies the same JSX/ESM transform the real app uses — a more faithful check than plain Node, not a weaker one. Ran the plan's exact acceptance-criteria assertions (required methods present, isLoading/lastError keys, login/register POST bodies and auth:false, token storage, session-key persistence, no v1 blob, cariAkun/tambahAkun throwing, logout clearing) through this harness — all passed.
- **Files modified:** None (verification-method-only deviation, no source change).
- **Verification:** See "Manual/Live Verification" section below for the full pass list.
- **Committed in:** N/A (verification approach only; no commit needed)

---

**Total deviations:** 3 auto-fixed (3 Rule 3 — blocking issues, all in verification tooling/environment gaps, zero scope creep into domain mutators or UI).
**Impact on plan:** All three fixes were necessary to make the plan's own verification steps actually executable in this environment, or to prevent the app from crashing on load due to the plan's own seed-removal instruction. No architectural deviation, no unplanned feature work.

## Issues Encountered

None beyond the deviations above. The live Express backend (Postgres-backed, seeded) and Vite dev server were both started and used for genuine live verification (not just mocked), confirmed below.

## Manual/Live Verification

No headless-browser tool (Playwright/chromium-cli) is installed in this environment, consistent with the blocker already on record in STATE.md ("DESIGN-04/Phase 5... no chromium-cli/Playwright available"). Per project policy (Rule 3's package-install exclusion), a fresh `npx playwright install` was deliberately NOT run ad-hoc to satisfy this single check. Instead, the auth flow was verified end-to-end against the REAL running Express backend (port 4000, Postgres-backed via `switera-db-1`) and the REAL running Vite dev server (port 5173):

- `POST /auth/login` with `admin`/`admin123` → 200, returns `{ token, user: { role: "Admin", ... } }` (curl, direct).
- `POST /auth/login` with wrong password → 401 `{ "error": "Username atau password salah." }` (curl, direct) — confirms the generic anti-enumeration message T-07-ENUM expects.
- CORS preflight (`OPTIONS /auth/login`, `Origin: http://localhost:5173`) → 204 with `Access-Control-Allow-Origin: http://localhost:5173` — confirms the browser-visible Vite origin is allowed.
- `GET /kota` with a malformed Bearer token → 401 `{ "error": "Token tidak valid atau kedaluwarsa." }` (curl, direct) — confirms requireAuth's 401 contract apiClient relies on.
- `store.register(...)` against the LIVE backend with a duplicate username (`admin`) → throws with message `"Username sudah digunakan."`, exactly matching `Register.jsx`'s `error.message.includes("sudah digunakan")` field-mapping check (ran through `store.js` via Vite's `ssrLoadModule`, not mocked).
- `store.register(...)` against the LIVE backend with a fresh unique username, followed by `store.login(...)` for that same new account → both succeed; the returned/cached `userAktif.role` came from the server's account record (`"Tim Logistik"`), not the client-selected role pill, confirming the "role is no longer a login credential" decision; `state.isLoading` correctly settles back to `false` after the requests complete; the JWT was persisted via `setToken`.
- A simulated 401 response (mocked `fetch`, since forcing a real token expiry would require waiting out the JWT TTL) confirmed `setUnauthorizedHandler` clears both `userAktif` and the stored token through the store's wiring — consistent with App.jsx's existing `!snapshot.userAktif` redirect needing no changes.
- All four touched/created modules (`src/store.js`, `src/api/apiClient.js`, `src/pages/Login.jsx`, `src/pages/Register.jsx`) were fetched directly through the running Vite dev server (`curl http://localhost:5173/src/...`) and each returned `200 OK`, confirming they transform cleanly through the exact pipeline a real browser would use.
- `npx vite build` completes with no errors (77 modules transformed, build succeeds in ~2-4s).
- `git diff` on `Login.jsx`/`Register.jsx` confirms only handler-body logic changed — zero JSX/styling/copy differences from the pre-existing v1.0 markup, satisfying the "pixel-identical" requirement structurally. A literal pixel/visual comparison in an actual rendered browser window was NOT performed (no browser automation tool available) — this is recorded as an open item, not falsely claimed as verified.

**Both background dev processes (Express on :4000, Vite on :5173) were left running** at the end of this plan's execution for continuity into 09-02; they can be stopped by the operator at any time without affecting committed work.

## Known Stubs

None. `store.hydrate()` is an intentional no-op stub by explicit plan design — 09-01 only introduces the symbol so App.jsx wiring and later plans have a stable hook; it is documented in the plan objective as deferred to 09-05, not a hidden gap.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-09-JWT, T-09-401, T-09-ATTACH, T-09-ENUM, T-09-SC) — no new network endpoints, auth paths, or schema changes were introduced beyond what the plan specified.

## User Setup Required

None - no external service configuration required. (The Express backend and Postgres container already existed from Phases 6-8; both were merely started, not newly configured.)

## Next Phase Readiness

- The apiClient + hydrated-cache + Promise-mutator + loading/error pattern is fully proven on the auth slice and ready for 09-02 (kota/stok), 09-03 (permintaan), 09-04 (keputusan/notifikasi) to reuse verbatim without re-deciding anything.
- `store.hydrate()` exists as a stable stub; 09-05 will complete it and wire it into App.jsx's bootstrap path.
- Carried-forward concern (unchanged by this plan): a true pixel-level browser visual regression check for Login/Register (and the rest of the app) still has not been performed with real browser automation — recommend installing Playwright (with explicit user approval, since it's a new dependency) before the milestone ships, per the blocker already on STATE.md.
- New minor item for a later plan: `Layout.jsx`'s "reset demo data" control now throws (was deliberately converted to a loud shim in this plan, see Deviation 2) — needs either a real server-side reset endpoint or removal of the UI affordance; out of scope for 09-01.

---
*Phase: 09-frontend-api-client-integration-loading-error-ux*
*Completed: 2026-06-25*

## Self-Check: PASSED

All claimed files exist on disk (`src/api/apiClient.js`, `src/store.js`, `src/pages/Login.jsx`, `src/pages/Register.jsx`, this SUMMARY.md) and all three task commit hashes (`b91cdc5`, `56ee400`, `dd53215`) are present in `git log`.
