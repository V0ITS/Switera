---
phase: 07-auth-authorization
plan: 01
subsystem: auth
tags: [express, jwt, bcrypt, jsonwebtoken, bcryptjs, prisma, auth]

# Dependency graph
requires:
  - phase: 06-01
    provides: "server/ Node.js project scaffold, Express 5 + jsonwebtoken + bcryptjs installed, JWT_SECRET env var declared"
  - phase: 06-03
    provides: "server/src/db/prismaClient.js shared PrismaClient instance, service-layer style established in kotaService.js"
provides:
  - "server/src/index.js — first real Express HTTP server for Switera, with GET /health and the /auth router mounted"
  - "server/src/auth/jwt.js — signToken/verifyToken (HS256-pinned) JWT helpers"
  - "server/src/services/akunService.js — verifyLogin (bcrypt.compare), registerAkun (bcrypt.hash cost 10), getNextAkunId"
  - "server/src/routes/authRoutes.js — POST /auth/login, POST /auth/register"
  - "server/src/auth/akunService.verify.mjs — standalone idempotent verification script"
affects: [07-02, 08-domain-crud, 09-frontend-integration, 10-multi-client-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side auth replaces v1's client-only plaintext src/store.js cariAkun — login now verifies username+password via bcrypt.compare against the live Akun table and returns the account's actual stored role (no client-supplied role field), closing the v1 role-spoofing gap"
    - "JWT signing/verification centralized in server/src/auth/jwt.js, pinned to algorithm HS256 on both sign and verify — verifyToken explicitly passes { algorithms: [\"HS256\"] } to reject alg:none and algorithm-confusion forgeries"
    - "Express app entrypoint (server/src/index.js) exports the configured app as a named export AND conditionally calls app.listen only when the module is the directly-executed entry point, using pathToFileURL(process.argv[1]).href compared against import.meta.url — required for cross-platform correctness on Windows (see Deviations)"
    - "Auth routes return the same generic 401 message for both unknown-username and wrong-password (credential-enumeration mitigation), and never echo password/hash fields in any response"

key-files:
  created:
    - server/src/auth/jwt.js
    - server/src/services/akunService.js
    - server/src/routes/authRoutes.js
    - server/src/routes/roleOptions.js
    - server/src/index.js
    - server/src/auth/akunService.verify.mjs
  modified:
    - server/package.json
    - server/.env (gitignored, not committed — JWT_SECRET placeholder replaced with a real random value)

key-decisions:
  - "Created server/src/routes/roleOptions.js as a small server-side copy of src/utils/navigation.js's roleOptions array, rather than importing across the frontend/backend project boundary — server/ is a fully independent Node.js project per Phase 6 Plan 1"
  - "Fixed the plan's specified run-directly check (import.meta.url === `file://${process.argv[1]}`) to use pathToFileURL(process.argv[1]).href instead — the literal template-string version is not cross-platform safe on Windows, where process.argv[1] uses backslashes and import.meta.url uses forward slashes, causing the comparison to always fail and silently skipping app.listen (see Deviations)"
  - "Generated a real random JWT_SECRET (48 random bytes, base64) and wrote it into server/.env per the plan's user_setup instruction, replacing the placeholder value; server/.env stays gitignored so the secret is never committed"

patterns-established:
  - "akunService.js follows kotaService.js's established service-layer style exactly: framework-agnostic async functions, JSDoc, Indonesian error messages, importing the single shared prismaClient — Phase 8 services should continue this pattern"
  - "Standalone .mjs verification scripts (no test framework, per CLAUDE.md) continue as the project's mechanism for proving backend invariants outside HTTP — akunService.verify.mjs follows kotaService.verify.mjs's idempotent, self-cleaning pattern"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 15min
completed: 2026-06-24
status: complete
---

# Phase 7 Plan 1: Server-Side Auth (Login + Register) Summary

**Express 5 HTTP server with bcrypt-verified JWT login and bcrypt-hashed registration, replacing v1's client-only plaintext auth in src/store.js.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-24T13:50:00Z
- **Completed:** 2026-06-24T14:05:00Z
- **Tasks:** 2
- **Files modified:** 6 created, 1 modified (server/package.json) + server/.env value updated (gitignored)

## Accomplishments

- First real Express HTTP server for Switera (`server/src/index.js`): `GET /health` returns 200, `/auth` router mounted, CORS + JSON body parsing configured, reads `PORT` from env (default 4000)
- `server/src/auth/jwt.js`: `signToken`/`verifyToken` pinned to HS256, reading `JWT_SECRET` only from `process.env` (never hardcoded), rejecting tokens signed with a different secret or a different/`none` algorithm
- `server/src/services/akunService.js`: `verifyLogin` does a real `bcrypt.compare` against the live `Akun` table (no plaintext comparison anywhere), returns `null` on wrong password or unknown username without throwing; `registerAkun` hashes with `bcrypt.hash` at cost factor 10 (matching `seed.js`) and rejects duplicate usernames with `Error("Username sudah digunakan.")`
- `server/src/routes/authRoutes.js`: `POST /auth/login` returns a signed JWT + user object (without password) on success, a single generic 401 message for both wrong-password and unknown-username (credential-enumeration mitigation), and 400 on missing fields; `POST /auth/register` validates all fields including role membership, returns 201 with the created user (no password/hash echoed), 409 on duplicate username, and never leaks raw errors (generic 500 fallback)
- `server/src/auth/akunService.verify.mjs`: standalone idempotent script proving `LOGIN_OK`, `REGISTER_HASH_OK`, `DUP_REJECT_OK` against the live database, self-cleaning its throwaway test account — re-run twice with identical pass output
- Manually verified end-to-end via curl against the running server: `/health`, `/auth/login` (correct/wrong/missing), `/auth/register` (success/duplicate/invalid-role), plus a direct DB check confirming the stored password column starts with `$2` (bcrypt), never plaintext

## Task Commits

Each task was committed atomically:

1. **Task 1: JWT helper + akunService (bcrypt login verify, register hash)** - `0254284` (feat)
2. **Task 2: Express app entrypoint + /auth routes (login, register)** - `78b892f` (feat)

**Plan metadata:** skipped (commit_docs: false — temporary autonomous-run override for v2.0 Phases 6-10; SUMMARY.md/STATE.md/ROADMAP.md updated on disk only, not committed)

## Files Created/Modified

- `server/src/auth/jwt.js` - `signToken`/`verifyToken`, HS256-pinned, JWT_SECRET read only from env, throws on missing/placeholder secret
- `server/src/services/akunService.js` - `verifyLogin` (bcrypt.compare), `registerAkun` (bcrypt.hash cost 10 + prisma.akun.create), `getNextAkunId` (U### convention from store.js)
- `server/src/routes/authRoutes.js` - Express Router: `POST /login`, `POST /register`, generic error responses, no stack-trace/raw-error leakage
- `server/src/routes/roleOptions.js` - Server-side copy of the three valid role strings, used for register input validation
- `server/src/index.js` - Express app entrypoint: cors, express.json(), GET /health, mounts /auth router, named `app` export + conditional `app.listen`
- `server/src/auth/akunService.verify.mjs` - Standalone idempotent verification script (LOGIN_OK / REGISTER_HASH_OK / DUP_REJECT_OK)
- `server/package.json` - `dev`/`start` scripts updated to point at `src/index.js` (previously pointed at a non-existent root `index.js`)
- `server/.env` - JWT_SECRET placeholder replaced with a real random secret (gitignored, not committed; see Decisions)

## Decisions Made

- Created `server/src/routes/roleOptions.js` instead of importing `src/utils/navigation.js` from the frontend — `server/` is a fully independent Node.js project (Phase 6 decision), so no cross-project imports
- Fixed the plan's literal run-directly check to use `pathToFileURL(process.argv[1]).href` for Windows cross-platform correctness (see Deviations below — this was a Rule 1 bug-fix, not a design change)
- Generated and installed a real random `JWT_SECRET` into `server/.env` per the plan's `user_setup` instruction (48 random bytes, base64-encoded), replacing the placeholder-style dev value

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed non-cross-platform "run directly" check in server/src/index.js**
- **Found during:** Task 2, manual verification (server failed to start a listener when run directly)
- **Issue:** The plan's specified idiom `import.meta.url === \`file://${process.argv[1]}\`` is not Windows-safe: `process.argv[1]` on Windows is a backslash path (`C:\Users\...\src\index.js`) while `import.meta.url` always uses forward slashes (`file:///C:/Users/...`), so the string comparison never matches and `app.listen` was silently never called — the server process exited immediately with no error and no output.
- **Fix:** Replaced the comparison with `pathToFileURL(process.argv[1]).href`, which normalizes the path to the same URL format `import.meta.url` produces, making the check work correctly on Windows, macOS, and Linux.
- **Files modified:** `server/src/index.js`
- **Verification:** Ran `node --env-file=.env src/index.js` as a background process; `curl http://localhost:4000/health` returned `200 {"status":"ok"}` confirming the listener actually started.
- **Committed in:** `78b892f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary correctness fix — without it the Express server entrypoint silently never starts when run via `npm run dev`/`npm start` on Windows, which is this project's actual execution environment. No scope creep; behavior matches the plan's intent exactly (`app.listen` when run directly, named `app` export when imported).

## Issues Encountered

None beyond the deviation above. The Postgres dev container (`switera-db-1`) and seeded data from Phase 6 were already running and intact, confirmed via `docker ps` before starting — no container restart or re-seed needed.

## User Setup Required

**JWT_SECRET replaced.** Per the plan's `user_setup` block, `server/.env`'s `JWT_SECRET` was regenerated to a real random value (`crypto.randomBytes(48).toString("base64")`) during this plan's execution — no further action needed from the user. `server/.env` remains gitignored (established in Phase 6), so the new secret is local-only and was not committed.

**Pre-production TODO (not actioned this plan, out of scope):** The current secret is suitable for local development only. Before any real deployment, rotate to a secret generated and stored via a proper secrets-management mechanism (not a checked-in or shell-history-visible value).

## Next Phase Readiness

- `server/src/auth/jwt.js` and `server/src/services/akunService.js` are ready for Plan 07-02 (likely an auth middleware / protected-route layer) to import `verifyToken` for request authentication
- `server/src/index.js`'s named `app` export is ready for any future route module (Phase 8 domain CRUD) to mount additional routers without restructuring the entrypoint
- The credential-enumeration-safe login response shape (`{ token, user: { id, nama, username, role } }`) and the register response shape (`{ user: {...} }`, no password ever echoed) are established conventions Phase 8/9 should match for any other auth-adjacent endpoints
- T-07-BRUTE (no rate-limiting on login) remains explicitly accepted per the plan's threat model — not actioned, not a gap, documented as a v2 candidate
- No blockers identified

## Self-Check: PASSED

- FOUND: server/src/auth/jwt.js
- FOUND: server/src/services/akunService.js
- FOUND: server/src/routes/authRoutes.js
- FOUND: server/src/routes/roleOptions.js
- FOUND: server/src/index.js
- FOUND: server/src/auth/akunService.verify.mjs
- FOUND: 0254284 (in git log)
- FOUND: 78b892f (in git log)
- `node src/auth/akunService.verify.mjs` prints `LOGIN_OK true`, `REGISTER_HASH_OK true`, `DUP_REJECT_OK true`, exit code 0 — re-ran twice with identical output (idempotency confirmed)
- Manual curl verification: `GET /health` → 200; `POST /auth/login` correct → 200 + JWT; wrong password → 401 generic message; nonexistent user → 401 identical generic message; missing fields → 400
- Manual curl verification: `POST /auth/register` success → 201; duplicate username → 409; invalid role → 400
- Direct DB check: registered account's `password` column confirmed to start with `$2` (bcrypt), never plaintext; throwaway test accounts cleaned up after verification

---
*Phase: 07-auth-authorization*
*Completed: 2026-06-24*
