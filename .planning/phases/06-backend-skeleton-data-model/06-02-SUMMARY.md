---
phase: 06-backend-skeleton-data-model
plan: 02
subsystem: database
tags: [prisma, postgres, bcrypt, seed-data, backend-skeleton]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Postgres dev container, server/ project scaffold, Prisma schema (7 models) with applied migration"
provides:
  - "server/prisma/data/ — server-side copies of the 4 frontend JSON seed files (permintaan, keputusan, notifikasi, activityLog), decoupling backend seeding from src/"
  - "server/prisma/seed.js — idempotent (upsert-based) seed script populating all 7 tables, bcrypt-hashing the 3 seed account passwords (cost factor 10) before any database write"
  - "server/prisma/verify-seed.mjs — standalone, re-runnable script proving row counts per domain and bcrypt-hash-only passwords without needing psql/Prisma Studio"
  - "Live PostgreSQL database populated: Akun=3, Kota=8, Permintaan=15, Keputusan=3, RiwayatKeputusan=3, Notifikasi=5, ActivityLog=0"
affects: [07-auth, 08-domain-crud, 09-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backend seed data lives in server/prisma/data/ as verbatim copies of src/data/*.json — server/ has zero runtime import dependency on the frontend's src/ tree"
    - "Seed/verification scripts use upsert() keyed on each model's natural @id, making re-seeding during iterative development a safe no-op/update instead of a unique-constraint crash"
    - "Plaintext seed passwords exist only as source literals in seed.js and only transiently in process memory during bcrypt.hash() — never written to the database unhashed"

key-files:
  created:
    - server/prisma/data/permintaan.json
    - server/prisma/data/keputusan.json
    - server/prisma/data/notifikasi.json
    - server/prisma/data/activityLog.json
    - server/prisma/seed.js
    - server/prisma/verify-seed.mjs
  modified: []

key-decisions:
  - "Inlined akunSeed (3 accounts) and kotaSeed (8 cities) directly as constants in seed.js, matching how they exist as inline arrays (not JSON files) in src/store.js — only the 4 actual JSON files were copied into server/prisma/data/"
  - "Notifikasi.waktu and ActivityLog.waktu are typed DateTime in the Plan 01 schema; seed.js converts the JSON's ISO-8601 string values via `new Date(...)` at write time rather than changing the schema or the source JSON format"
  - "Did not invent a per-city or global stock field for the legacy stokTbsSeed=150 value — confirmed out of scope for DATA-01/02/03 per the plan's explicit read_first note; left unaddressed, deferred to Phase 8 planning if still needed"

patterns-established:
  - "Standalone .mjs verification scripts (no test framework) are the project's chosen mechanism for proving backend invariants — verify-seed.mjs sets the pattern for any future Phase 6-10 scripts that need to assert DB state without psql/Prisma Studio"

requirements-completed: [DATA-02]

# Metrics
duration: 7min
completed: 2026-06-24
status: complete
---

# Phase 6 Plan 2: Seed Data Migration & Bcrypt Hashing Summary

**Prisma seed script migrates all 7 store.js data domains into the live PostgreSQL database, bcrypt-hashing (cost factor 10) the 3 seed account passwords before they ever reach the Akun table — confirmed via direct psql inspection and a standalone verify-seed.mjs script.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-24T13:34:50Z
- **Completed:** 2026-06-24T13:41:53Z
- **Tasks:** 2
- **Files modified:** 6 created, 0 modified

## Accomplishments

- `server/prisma/data/` now holds verbatim copies of the 4 existing frontend JSON seed files, decoupling the backend's seeding process from `src/` entirely
- `server/prisma/seed.js` seeds all 7 Prisma models (Kota → Akun → Permintaan → Keputusan/RiwayatKeputusan → Notifikasi → ActivityLog, respecting FK order) using `upsert()` for safe re-runs
- All 3 seed account passwords (`manajer123`, `logistik123`, `admin123`) are bcrypt-hashed (`bcrypt.hash(plaintext, 10)`) before the single `prisma.akun.upsert()` call that writes them — confirmed directly via `psql` that no plaintext password ever lands in the `Akun` table
- `server/prisma/verify-seed.mjs` independently confirms both DATA-02 success criteria (row counts, bcrypt-only passwords) via `count()`/`findMany()` against the live database, printing a machine-checkable `COUNTS ...` / `BCRYPT_OK true` summary
- Idempotency verified empirically: re-running `node prisma/seed.js` a second time against the already-seeded database exits 0 with identical row counts, no unique-constraint errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy seed data into server/ and write the bcrypt-hashing seed script** - `14d22e9` (feat)
2. **Task 2: Write and run a standalone seed verification script** - `04f4472` (feat)

**Plan metadata:** skipped (commit_docs: false — temporary autonomous-run override for v2.0 Phases 6-10; SUMMARY.md/STATE.md/ROADMAP.md updated on disk only, not committed)

## Files Created/Modified

- `server/prisma/data/permintaan.json` - Verbatim copy of `src/data/permintaan.json` (15 entries)
- `server/prisma/data/keputusan.json` - Verbatim copy of `src/data/keputusan.json` (3 entries)
- `server/prisma/data/notifikasi.json` - Verbatim copy of `src/data/notifikasi.json` (5 entries)
- `server/prisma/data/activityLog.json` - Verbatim copy of `src/data/activityLog.json` (empty array)
- `server/prisma/seed.js` - ESM seed script: bcrypt-hashes 3 Akun passwords before write, upserts all 7 models in FK-safe order
- `server/prisma/verify-seed.mjs` - Standalone ESM verification script: counts all 7 models, checks bcrypt hash prefix on all 3 Akun passwords, exits non-zero on any mismatch

## Decisions Made

- Inlined `akunSeed`/`kotaSeed` as constants in `seed.js` rather than creating new JSON files for them, mirroring their existing inline-array form in `src/store.js`
- Converted JSON string timestamps (`Notifikasi.waktu`, `ActivityLog.waktu`) to `Date` objects at seed-write time to match the Plan 01 schema's `DateTime` typing, without altering the source JSON format
- Left the legacy `stokTbsSeed = 150` value unmodeled, per the plan's explicit instruction that it's out of scope for DATA-01/02/03 and belongs to a future Phase 8 decision if still needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The Postgres dev container (`switera-db-1`) from Plan 01 was already running, confirmed via `docker ps` before seeding — no container restart needed. One cosmetic non-issue: the newly-created `server/prisma/data/*.json` files were written with LF line endings while the original `src/data/*.json` files use CRLF (this Windows checkout has `core.autocrlf=true`); content is byte-identical once line endings are normalized, and git will apply its own LF/CRLF conversion on commit/checkout regardless — not a real divergence, no action needed.

## User Setup Required

None - no external service configuration required. The Docker Postgres container from Plan 01 was already running in this environment.

## Next Phase Readiness

- Live PostgreSQL database is now fully populated and ready for Phase 7 (auth) to authenticate against real bcrypt-hashed `Akun` rows instead of `store.js`'s plaintext comparison
- `server/prisma/verify-seed.mjs` is reusable as a regression check during Phase 8 (domain CRUD) development, to confirm seed data integrity after schema changes
- Seed script's upsert-based idempotency means future phases can safely re-run `npm run db:seed` during iterative development without manual DB resets
- No blockers identified

## Self-Check: PASSED

- FOUND: server/prisma/data/permintaan.json
- FOUND: server/prisma/data/keputusan.json
- FOUND: server/prisma/data/notifikasi.json
- FOUND: server/prisma/data/activityLog.json
- FOUND: server/prisma/seed.js
- FOUND: server/prisma/verify-seed.mjs
- FOUND: 14d22e9 (in git log)
- FOUND: 04f4472 (in git log)
- `node prisma/seed.js` exit 0, all 7 tables populated
- `node prisma/verify-seed.mjs` prints `COUNTS akun=3 kota=8 permintaan=15 keputusan=3 riwayatKeputusan=3 notifikasi=5 activityLog=0` and `BCRYPT_OK true`, exit 0
- Direct `psql` query on `Akun.password` confirms all 3 values start with `$2a$10$` (bcrypt hash), never the literal plaintext passwords
- Re-running `node prisma/seed.js` a second time: exit 0, no unique-constraint errors, identical row counts (idempotency confirmed)

---
*Phase: 06-backend-skeleton-data-model*
*Completed: 2026-06-24*
