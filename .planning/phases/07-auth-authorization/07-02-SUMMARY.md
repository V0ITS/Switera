---
phase: 07-auth-authorization
plan: 02
subsystem: auth
tags: [express, jwt, rbac, middleware]

# Dependency graph
requires:
  - phase: 07-01
    provides: "server/src/auth/jwt.js (verifyToken, HS256-pinned), server/src/index.js (named app export), server/src/routes/authRoutes.js (POST /auth/login issuing role-bearing JWTs)"
provides:
  - "server/src/middleware/requireAuth.js — Express middleware verifying Bearer JWT, 401 on missing/invalid/expired, attaches req.user"
  - "server/src/middleware/requireRole.js — Express middleware factory, 403 when req.user.role is outside an explicit allow-list"
  - "server/src/routes/protectedRoutes.js — demo routes (GET /me, POST /admin-only, POST /manajer-only) proving the guard contract"
  - "server/src/middleware/rbac.verify.mjs — standalone idempotent script proving 401/403/200 against a live ephemeral-port app instance"
affects: [08-domain-crud, 09-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side RBAC enforced via composable Express middleware (requireAuth then requireRole(...roles)) applied per-route — never derived from or coupled to src/utils/navigation.js's menuByRole, which remains purely cosmetic frontend gating (AUTH-03)"
    - "requireAuth treats every jwt.verify failure mode (expired, malformed, tampered, wrong algorithm) uniformly as a single generic 401 — the underlying jwt error is never echoed to the client (T-07-ERRLEAK2)"
    - "Standalone .mjs verification scripts continue as the project's mechanism for proving backend invariants outside HTTP (no test framework, per CLAUDE.md); rbac.verify.mjs starts the app on an ephemeral port (app.listen(0)) and closes it at the end, making it safely re-runnable without colliding with a dev server already on PORT"

key-files:
  created:
    - server/src/middleware/requireAuth.js
    - server/src/middleware/requireRole.js
    - server/src/routes/protectedRoutes.js
    - server/src/middleware/rbac.verify.mjs
  modified:
    - server/src/index.js

key-decisions:
  - "rbac.verify.mjs uses Node's built-in fetch against app.listen(0) (ephemeral port) rather than a fixed PORT, so the script never collides with a developer's running dev server and is fully re-runnable/idempotent, matching the established akunService.verify.mjs pattern from Plan 07-01"
  - "Demo protected routes (GET /me, POST /admin-only, POST /manajer-only) are intentionally throwaway — Phase 8 replaces them with real domain routes that reuse the exact same requireAuth + requireRole(...) middleware composition"

patterns-established:
  - "Phase 8 mutating routes should apply requireAuth then requireRole(...allowedRoles) in that order on every route, exactly as protectedRoutes.js demonstrates — this is now the copy-paste RBAC contract for the rest of the backend"

requirements-completed: [AUTH-03, AUTH-04]

# Metrics
duration: 2min
completed: 2026-06-24
status: complete
---

# Phase 7 Plan 2: Server-Side Authorization (requireAuth + requireRole RBAC) Summary

**Express middleware enforcing 401 on missing/invalid JWTs and 403 on valid-but-wrong-role requests, proven by a standalone RBAC verification script against a live ephemeral-port app instance.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-24T14:11:32Z
- **Completed:** 2026-06-24T14:13:39Z
- **Tasks:** 2
- **Files modified:** 4 created, 1 modified

## Accomplishments

- `server/src/middleware/requireAuth.js`: reads the `Authorization: Bearer <token>` header, responds 401 `{ error: "Token tidak ada." }` when missing/malformed, calls `verifyToken` and responds 401 `{ error: "Token tidak valid atau kedaluwarsa." }` on any verification failure (expired, malformed, tampered, wrong algorithm — never distinguished to the client), and on success attaches `req.user = { id, username, role }` from the verified payload before calling `next()`
- `server/src/middleware/requireRole.js`: factory `requireRole(...allowedRoles)` returning middleware that responds 403 `{ error: "Anda tidak memiliki izin untuk aksi ini." }` when `req.user.role` is outside the explicit allow-list (single-role and multi-role allow-lists both verified), else calls `next()` — the allow-list is passed per-route and never consults the frontend's `menuByRole`
- `server/src/routes/protectedRoutes.js`: demo router with `GET /me` (any authenticated role), `POST /admin-only` (`requireRole("Admin")`), `POST /manajer-only` (`requireRole("Manajer Distribusi")`), establishing the requireAuth-then-requireRole ordering Phase 8 will reuse
- `server/src/index.js`: mounted the protected router at `/protected` alongside the existing `/health` and `/auth` routes, with no other behavioral change to cors/json/listen wiring
- `server/src/middleware/rbac.verify.mjs`: standalone idempotent script that logs in as `admin` and `logistik` via the real `/auth/login` endpoint, then asserts 401 (no header), 401 (malformed token `"Bearer not.a.jwt"`), 403 (logistik token on `/protected/admin-only`), and 200 (admin token on `/protected/admin-only`, plus logistik token on `/protected/me`) — printing `AUTH_REQUIRED_OK`, `RBAC_DENY_OK`, `RBAC_ALLOW_OK` and exiting 0; verified re-runnable (ran twice with identical pass output)
- Manually verified end-to-end via curl against a running server: `POST /protected/admin-only` with a logistik token → 403; with an admin token → 200; with no header → 401; with a malformed token → 401 — matching the plan's `<verification>` block exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: requireAuth (401) + requireRole (403) middleware** - `8fa6429` (feat)
2. **Task 2: Demo protected routes + mount on app + RBAC verification script** - `a81ec5f` (feat)

**Plan metadata:** skipped (commit_docs: false — temporary autonomous-run override for v2.0 Phases 6-10; SUMMARY.md/STATE.md/ROADMAP.md updated on disk only, not committed)

## Files Created/Modified

- `server/src/middleware/requireAuth.js` - Bearer JWT verification middleware, 401 on missing/invalid/expired, attaches `req.user`
- `server/src/middleware/requireRole.js` - `requireRole(...roles)` factory middleware, 403 on role not in allow-list
- `server/src/routes/protectedRoutes.js` - Demo router proving the guard contract: `GET /me`, `POST /admin-only`, `POST /manajer-only`
- `server/src/index.js` - Mounted `/protected` router alongside existing `/health` and `/auth` routes
- `server/src/middleware/rbac.verify.mjs` - Standalone idempotent verification script (`AUTH_REQUIRED_OK` / `RBAC_DENY_OK` / `RBAC_ALLOW_OK`), runs the app on an ephemeral port and closes it on exit

## Decisions Made

- Used `app.listen(0)` (ephemeral port) plus Node's built-in `fetch` in `rbac.verify.mjs` instead of assuming a fixed `PORT`, so the verify script never collides with a developer's already-running dev server and stays idempotent/re-runnable, matching `akunService.verify.mjs`'s established pattern
- Kept `protectedRoutes.js` intentionally minimal/throwaway per the plan — Phase 8's real domain routes will apply the identical `requireAuth` + `requireRole(...)` composition rather than reinventing authorization per route

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The Postgres dev container (`switera-db-1`) was already running and the Phase 7 Plan 1 seed accounts (`admin`/`admin123` as Admin, `logistik`/`logistik123` as Tim Logistik) were available and used directly by `rbac.verify.mjs` — no new seed data or container changes were needed.

## User Setup Required

None - no external service configuration required. `server/.env`'s `JWT_SECRET` was already set to a real random value by Plan 07-01.

## Next Phase Readiness

- `server/src/middleware/requireAuth.js` and `server/src/middleware/requireRole.js` are ready for Phase 8's domain CRUD routes to import directly — the documented pattern is `router.METHOD(path, requireAuth, requireRole("Role A", "Role B"), handler)`
- `server/src/routes/protectedRoutes.js` is explicitly a throwaway demo and should be removed or replaced once Phase 8's real domain routes exist; it is not meant to ship as permanent API surface
- `server/src/middleware/rbac.verify.mjs` is reusable as a regression check — re-run after any future change to `requireAuth`/`requireRole` to confirm the 401/403/200 contract still holds
- Phase 7 (Auth & Authorization) is now complete — both plans (07-01: server-side login/register, 07-02: requireAuth/requireRole RBAC) executed and verified end-to-end
- No blockers identified

## Self-Check: PASSED

- FOUND: server/src/middleware/requireAuth.js
- FOUND: server/src/middleware/requireRole.js
- FOUND: server/src/routes/protectedRoutes.js
- FOUND: server/src/middleware/rbac.verify.mjs
- FOUND: 8fa6429 (in git log)
- FOUND: a81ec5f (in git log)
- `node src/middleware/rbac.verify.mjs` prints `LOGIN_SETUP_OK true`, `AUTH_REQUIRED_OK true`, `RBAC_DENY_OK true`, `RBAC_ALLOW_OK true`, exit code 0 — re-ran twice with identical output (idempotency confirmed)
- Manual curl verification against a running server: no-header → 401; malformed token → 401; logistik token on `/protected/admin-only` → 403; admin token on `/protected/admin-only` → 200 — all match the plan's `<verification>` block

---
*Phase: 07-auth-authorization*
*Completed: 2026-06-24*
