# Codebase Concerns

**Analysis Date:** 2026-07-01

---

## Critical (blocks production use)

### Open Registration Allows Arbitrary Role Escalation

**Issue:** `POST /auth/register` (`server/src/routes/authRoutes.js:38`) is unauthenticated and accepts `role` as a free-form string from the caller. Any unauthenticated user with network access can self-register as `"Admin"`. The only guard is the `roleOptions` array check (`authRoutes.js:51`), which confirms the value is one of the valid roles — but that still allows creating an Admin account without any existing admin approving it.

**Files:** `server/src/routes/authRoutes.js:38-66`, `server/src/routes/roleOptions.js`

**Impact:** In any multi-user environment beyond the closed school demo, this invalidates the entire RBAC model. A malicious actor registers as Admin and has unrestricted write access to all domain data.

**Fix approach:** Gate `POST /auth/register` behind `requireAuth` + `requireRole("Admin")` so only an existing Admin can create new accounts, OR remove self-service registration entirely and use seeded accounts only.

---

### JWT Stored in localStorage — XSS Exposure

**Issue:** The JWT token is persisted to `window.localStorage` under the key `"switera_token"` (`src/api/apiClient.js:11,23`). Any XSS vulnerability in any dependency or inline script can exfiltrate the token and impersonate the user until the 1-hour expiry.

**Files:** `src/api/apiClient.js:11-29`

**Impact:** Full account takeover for the token's lifetime. No refresh-token rotation means a stolen token cannot be invalidated short of restarting the server with a new `JWT_SECRET`.

**Fix approach:** Move token to an HttpOnly cookie (requires backend `Set-Cookie` + CSRF protection), or implement short-lived access tokens + HttpOnly refresh-token cookies. Accepted tradeoff for v2.0 school demo — documented in `.planning/STATE.md` as T-09-JWT.

---

### Notifications Are Not Scoped per User

**Issue:** `GET /notifikasi` (`server/src/routes/notifikasiRoutes.js:11-18`) returns ALL notification rows from the database to any authenticated caller, regardless of role or identity. There is no `userId`/`role` filter in the notifikasi service. Similarly `PUT /:id/baca` and `PUT /baca-semua` mark records as read globally — one user marking a notification read marks it read for everyone.

**Files:** `server/src/routes/notifikasiRoutes.js:11-36`, `server/prisma/schema.prisma:85-92` (no `userId` or `role` column on `Notifikasi`)

**Impact:** Tim Logistik sees Admin's system notifications and vice versa. "Mark all as read" by any user clears the badge for all logged-in users simultaneously.

**Fix approach:** Add a `role` or `userId` column to the `Notifikasi` model in `schema.prisma`, filter in the service layer by `req.user.role` (or `req.user.id`), and scope `tandaiDibaca`/`tandaiSemuaDibaca` to the caller's records only.

---

## High (degrades reliability/maintainability)

### No Rate Limiting on Any Endpoint

**Issue:** The Express server applies no rate-limiting middleware (no `express-rate-limit` or equivalent in `server/package.json`). Login attempts, registration, and every API call are unbounded.

**Files:** `server/src/routes/authRoutes.js:8-66`, `server/src/index.js`

**Impact:** Brute-force attacks on `/auth/login` are trivially feasible. The 4-second polling from all connected clients (7 GETs per tick) also has no server-side throttle if a client misbehaves or loops.

**Fix approach:** Add `express-rate-limit` to `server/package.json`; apply a strict limiter (e.g. 10 req/min) to `/auth/login` and `/auth/register`, a looser limiter to all other routes.

---

### `role` Field Has No DB-Level Enum Constraint

**Issue:** `Akun.role` is declared as `String` in `server/prisma/schema.prisma:17` — no Prisma `enum`, no `@check` constraint. Only the application layer (`roleOptions.js`) validates the value at registration time.

**Files:** `server/prisma/schema.prisma:17`, `server/src/routes/roleOptions.js`

**Impact:** A direct database INSERT or a bug that bypasses the route layer can persist an invalid role string. `requireRole(...)` middleware would then silently reject all requests for that account, producing confusing 403 errors with no data-integrity signal.

**Fix approach:** Change `role String` to a Prisma `enum Role { Admin ManjerDistribusi TimLogistik }` and add a migration. This enforces validity at the database level.

---

### Scan-Based ID Generation is Race-Prone Under Concurrent Requests

**Issue:** `getNextAkunId()` in `server/src/services/akunService.js:53-70` reads all existing IDs, finds the max numeric suffix, and increments — with no database transaction wrapping the read+compute+insert sequence. Under concurrent requests (two simultaneous registrations), both can read the same max, compute the same next ID, and one fails with a Prisma unique-constraint error that surfaces as an unhandled 500.

**Files:** `server/src/services/akunService.js:53-70`

**Impact:** Concurrent registration attempts can cause a 500 instead of a clean 409. Low probability at demo scale but the error path is not handled gracefully.

**Fix approach:** Use a PostgreSQL `SEQUENCE` for ID generation, or switch to `cuid()`/`uuid()` as the Prisma `@default`, eliminating collision risk at any concurrency level.

---

### 4-Second Polling Sends 7 Parallel Requests per Client per Tick

**Issue:** `store.hydrate()` (`src/store.js:339-354`) runs `Promise.all` over 7 `apiFetch` calls. `pollTick()` (`src/store.js:169-182`) calls `hydrate()` on a fixed 4000ms `setInterval`. With 3 demo accounts simultaneously logged in, this is 21 HTTP requests every 4 seconds — over 5 req/sec — all hitting PostgreSQL via Prisma.

**Files:** `src/store.js:163,169-182,339-354`

**Impact:** Negligible at school-demo scale (3 users) but the sync approach is fundamentally unscalable. A demo with many concurrent viewers would hit database connection pool limits quickly.

**Fix approach:** Replace polling with WebSocket/SSE (deferred as SYNC-02 in STATE.md). Short-term: increase `POLL_INTERVAL_MS` from 4000 to 10000ms, or load only changed collections per tick via `updatedSince` query parameters.

---

### No React Error Boundary — Render Errors Produce a Blank Page

**Issue:** `src/App.jsx` has no `<ErrorBoundary>` wrapping the route shell or individual page components. An unhandled JavaScript error thrown during render (e.g. unexpected `null` access in a page component) produces a completely blank white page with no user-visible message or recovery path.

**Files:** `src/App.jsx`

**Impact:** Silent failures during rendering; users see a white screen and must perform a full page reload with no indication of what went wrong.

**Fix approach:** Wrap `<ActivePage>` (and optionally `<Layout>`) in a React error boundary class component that renders a fallback UI with a reload button.

---

### `getState()` Deep-Clones the Full State Tree on Every `notify()`

**Issue:** Every `notify()` call (`src/store.js:120-124`) invokes `store.getState()` which performs `JSON.parse(JSON.stringify(state))` (`src/store.js:252-254`) and passes the full clone to every subscriber. On each polling tick (every 4s), this clones the entire in-memory cache regardless of which collection changed.

**Files:** `src/store.js:120-124,252-254`

**Impact:** Unnecessary CPU/GC pressure proportional to dataset size. Will degrade with hundreds of permintaan/keputusan/activityLog rows.

**Fix approach:** Pass the changed collection key + delta to subscribers, or adopt a selector pattern so components only receive the slice they subscribe to.

---

## Medium (tech debt / quality)

### `Keputusan` and `RiwayatKeputusan` Are Identical Tables

**Issue:** `server/prisma/schema.prisma` defines `Keputusan` (lines 41-57) and `RiwayatKeputusan` (lines 59-75) with identical column sets. The only semantic difference is that `RiwayatKeputusan` holds cancelled/archived decisions — a "copy on cancel" pattern implemented as two physical tables.

**Files:** `server/prisma/schema.prisma:41-75`

**Impact:** Schema and service-layer duplication. Any new column added to `Keputusan` must be manually mirrored to `RiwayatKeputusan` or the tables diverge silently.

**Fix approach:** Consolidate into a single `Keputusan` table with an `archivedAt DateTime?` or `isArchived Boolean` column plus an index. Eliminates the copy-on-cancel path and the duplicated service methods.

---

### Date Fields Stored as `String` — No Sort/Range Guarantee

**Issue:** `Permintaan.tanggalPermintaan`, `Permintaan.tanggalInput`, `Keputusan.tanggalKeputusan`, and `RiwayatKeputusan.tanggalKeputusan` are `String` in the Prisma schema (`schema.prisma:33-34,46,65`). Ordering by these columns in Prisma queries will sort lexicographically, which works only if all values are strictly `YYYY-MM-DD` ISO format — no DB constraint enforces this.

**Files:** `server/prisma/schema.prisma:33-34,46,65`

**Impact:** A malformed date insert (wrong format, empty string) silently corrupts sort order in reports and ranking calculations. `src/utils/distribusi.js` may also produce incorrect ranking output if dates are mis-sorted.

**Fix approach:** Migrate these columns to `DateTime`. Prisma will coerce ISO strings; existing data can be migrated with a Prisma migration script.

---

### `errorHandler.js` Uses Fragile Indonesian String Matching

**Issue:** `server/src/middleware/errorHandler.js:26-34` maps HTTP status codes by checking whether `err.message` contains `"sudah ada"`, `"sudah digunakan"`, `"tidak bisa dihapus"`, or `"tidak ditemukan"`. A new service that throws an error with slightly different wording falls through to 500.

**Files:** `server/src/middleware/errorHandler.js:26-34`

**Impact:** Easy to accidentally introduce a 500 response for a 4xx error by writing a slightly different Indonesian phrase. The comment at line 9 acknowledges this but does not enforce migration.

**Fix approach:** All services should throw with `Object.assign(new Error(msg), { statusCode: 4xx })`. Remove the string-matching fallback paths once all services are migrated to the `statusCode` convention.

---

### Dead Stubs and Orphaned Client-Side Functions in `store.js`

**Issue:**
- `store.cariAkun()` (~line 301), `store.tambahAkun()` (~line 310), `store.getNextAkunId()` (~line 316) — throw-only deprecated stubs with no callers.
- `pushNotifikasi()` (line 213) and `pushActivity()` (line 227) — client-side functions that construct local objects but are never called by any mutator (all notification/activity writes now happen server-side).
- `state.rekomendasi` and `state.kpi` cache fields (lines 99-100) and their loaders `loadRekomendasi()`/`loadKpi()` (~lines 561-574) are implemented but not consumed by any page component.

**Files:** `src/store.js:99-100,213,227,301,310,316,561-574`

**Impact:** Dead code increases cognitive load. The deprecated stubs will mask legitimate "missing method" bugs if future pages call them expecting real behavior.

**Fix approach:** Remove the three deprecated stubs, remove `pushNotifikasi`/`pushActivity` (server owns these side effects), and either wire `rekomendasi`/`kpi` into the pages that use them or remove the loaders entirely.

---

### `store.setRoleAktif()` Allows `roleAktif` to Diverge from `userAktif.role`

**Issue:** `store.setRoleAktif(role)` (`src/store.js:456-458`) is a public method that sets `state.roleAktif` independently of `state.userAktif.role`. If called with an arbitrary string, `App.jsx`'s `allowedPages` computation (line 133) would use the overridden role, bypassing frontend menu gating (though not server-side RBAC).

**Files:** `src/store.js:456-458`, `src/App.jsx:133`

**Impact:** Cosmetic — a buggy caller could display pages from a different role's menu. Server RBAC enforces the real boundary, so no actual permission escalation occurs.

**Fix approach:** Remove `setRoleAktif()` from the public store API. Derive `roleAktif` exclusively from `state.userAktif?.role` inside `getState()` so it is always in sync.

---

### No `.env.example` File — Setup Requires Reading README

**Issue:** `server/.env` is gitignored and no `.env.example` template is checked in. New developers must read the README to discover the required env vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`).

**Files:** `server/` (missing `server/.env.example`)

**Impact:** Onboarding friction; missing a required variable produces a cryptic startup error (e.g. `JWT_SECRET tidak ditemukan di environment` from `server/src/auth/jwt.js:14`).

**Fix approach:** Add `server/.env.example` with placeholder values and inline comments describing each variable.

---

## Low (nice-to-fix)

### Stale localStorage Key Removed in Logout/401 Handler

**Issue:** The logout handler (`src/store.js:325`) and the 401 unauthorized handler (`src/store.js:140`) both call `window.localStorage.removeItem("switera_user")`. This key was the v1.0 session key; it is never written in v2.0 (the current key is `"switera_session_v2"` set by `persistState` at line 109). The removal is a no-op.

**Files:** `src/store.js:140,325`

**Impact:** None at runtime. Misleading to future readers who may wonder where `"switera_user"` is written.

**Fix approach:** Remove both `removeItem("switera_user")` calls.

---

### `PLACEHOLDER_SECRET` String Committed to Source

**Issue:** `server/src/auth/jwt.js:3` defines `const PLACEHOLDER_SECRET = "replace-with-a-long-random-secret"` and uses it in an equality check at line 17. The intent is correct (throw if unchanged), but committing a known-bad secret string to source may confuse automated secret scanners.

**Files:** `server/src/auth/jwt.js:3,17`

**Impact:** Minimal — the check correctly throws on startup. No real secret is exposed.

**Fix approach:** Replace the equality check with a minimum-length check (`secret.length < 32`) and remove the hardcoded string constant.

---

### `distribusiRoutes.js` Exposes Endpoints Outside Any Resource Namespace

**Issue:** `server/src/routes/distribusiRoutes.js` mounts endpoints at `/rekomendasi-distribusi` and `/kpi` as top-level paths. All other route files use resource-scoped prefixes (`/kota`, `/permintaan`, `/keputusan`, etc.).

**Files:** `server/src/routes/distribusiRoutes.js:14,23`

**Impact:** Minor API design inconsistency. If routes are ever reorganized under a `/distribusi/*` prefix, `store.loadRekomendasi()` and `store.loadKpi()` in `src/store.js` must be updated.

**Fix approach:** Mount under `/distribusi` prefix: `/distribusi/rekomendasi` and `/distribusi/kpi`. Update store callers accordingly.

---

### No Test Suite

**Issue:** No test files, no test runner config, and no `"test"` npm script exist anywhere in the repository (frontend or backend). The utility modules (`src/utils/distribusi.js`, `src/utils/forecast.js`, `src/utils/format.js`) are pure functions that are straightforward to unit-test but are entirely untested.

**Files:** Entire codebase — no `*.test.*` or `*.spec.*` files found.

**Impact:** Regressions in the ranking calculation logic (`src/utils/distribusi.js`) or formatting helpers are invisible until manual testing catches them. Backend service layer is also fully untested.

**Fix approach:** Add Vitest to root `package.json` and write unit tests for `src/utils/distribusi.js` and `src/utils/forecast.js` at minimum. Add integration tests for the Express routes using `supertest` in `server/`.

---

*Concerns audit: 2026-07-01*
