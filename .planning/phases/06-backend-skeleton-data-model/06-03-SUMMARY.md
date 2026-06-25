---
phase: 06-backend-skeleton-data-model
plan: 03
subsystem: database
tags: [prisma, postgres, service-layer, referential-integrity, backend-skeleton]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Postgres dev container, server/ project scaffold, Prisma schema (7 models) with applied migration"
  - phase: 06-02
    provides: "Live seeded database (Akun=3, Kota=8, Permintaan=15, Keputusan=3, RiwayatKeputusan=3) to test the service layer against"
provides:
  - "server/src/db/prismaClient.js — the single PrismaClient instantiation point for the entire backend"
  - "server/src/services/kotaService.js — getDaftarKota, getKotaReferenceCounts, updateKota (cascade-rename), hapusKota (block-delete), ported 1:1 from src/store.js's referential-integrity rules but backed by live Prisma/PostgreSQL queries"
  - "server/src/services/kotaService.verify.mjs — standalone, idempotent, re-runnable script proving FK joins, block-delete, and cascade-rename all work correctly against the live database, independent of any HTTP route"
affects: [07-auth, 08-domain-crud, 09-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "server/src/db/prismaClient.js is the ONE place `new PrismaClient()` is called in the backend — all future services (Phase 7, 8) must import this shared instance instead of instantiating their own client, to avoid exhausting Postgres's connection pool"
    - "Service-layer functions run referential-integrity checks (reference-count lookup, duplicate-name lookup) BEFORE attempting the Prisma write, so application errors stay clean Indonesian messages matching today's UX rather than raw Postgres FK-violation errors bubbling up — the DB-level FK constraint (ON UPDATE CASCADE / ON DELETE RESTRICT from Plan 01) remains as defense-in-depth for any code path that skips this service layer"
    - "Multi-table cascade writes (Kota rename + 3 referencing tables) are wrapped in a single prisma.$transaction([...]) array so a mid-cascade failure rolls back everything, leaving no partially-renamed state"
    - "Standalone .mjs verification scripts (no test framework, per CLAUDE.md) continue as the project's mechanism for proving backend invariants — kotaService.verify.mjs follows the same pattern Plan 02's verify-seed.mjs established, and is itself idempotent (reverts its own test mutation at the end)"

key-files:
  created:
    - server/src/db/prismaClient.js
    - server/src/services/kotaService.js
    - server/src/services/kotaService.verify.mjs
  modified: []

key-decisions:
  - "Used Promise.all for the two independent count queries inside getKotaReferenceCounts (permintaan count, keputusan count) rather than sequential awaits — both queries are independent reads with no ordering dependency"
  - "updateKota's transaction array conditionally includes the 3 cascade updateMany operations only when namaBaru !== namaLama (matching store.js's own `if (namaBaru !== namaLama)` guard) — a capacity-only edit with no rename still runs inside a (single-operation) transaction for consistency, but skips the unnecessary updateMany calls"
  - "kotaService.verify.mjs chose Padang (not Pekanbaru) for the cascade-rename test, exactly as the plan specified, so the rename test's mutation doesn't collide with the block-delete test's Pekanbaru assertions if the script is re-run"

patterns-established:
  - "Service-layer functions are framework-agnostic Node/Prisma modules with zero Express/HTTP imports — Phase 8's route layer will call into these functions rather than embedding business logic in route handlers"

requirements-completed: [DATA-03]

# Metrics
duration: 2min
completed: 2026-06-24
status: complete
---

# Phase 6 Plan 3: Kota Service Layer & Referential-Integrity Verification Summary

**Server-side Kota service layer (cascade-rename + block-delete) backed by live Prisma/PostgreSQL queries, proven via a standalone idempotent verification script with zero HTTP route involved.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-24T13:45:16Z
- **Completed:** 2026-06-24T13:47:12Z
- **Tasks:** 2
- **Files modified:** 3 created, 0 modified

## Accomplishments

- `server/src/db/prismaClient.js` established as the single shared `PrismaClient` instance for the whole backend
- `server/src/services/kotaService.js` exposes 4 working async functions (`getDaftarKota`, `getKotaReferenceCounts`, `updateKota`, `hapusKota`) that replicate `src/store.js`'s referential-integrity rules exactly, but enforced against the live PostgreSQL database instead of in-memory state
- `updateKota`'s cascade-rename wraps the `Kota` rename plus 3 `updateMany` calls (`Permintaan.kotaNama`, `Keputusan.kotaTujuanNama`, `RiwayatKeputusan.kotaTujuanNama`) in one `prisma.$transaction([...])` — all-or-nothing, no partial-rename state possible
- `hapusKota` checks reference counts before attempting the delete, throwing the exact same Indonesian error message as `store.js` (`Kota ${nama} tidak bisa dihapus karena masih digunakan oleh ${permintaanCount} permintaan dan ${keputusanCount} keputusan distribusi.`) instead of letting a raw Postgres FK-violation error bubble up
- `server/src/services/kotaService.verify.mjs` independently proves all 3 remaining ROADMAP Phase 6 success criteria against the live seeded database: FK joins return correctly joined rows, delete is rejected when referenced, and rename cascades — confirmed idempotent by running it twice in a row with identical `_OK true` output both times
- Additionally hand-verified (outside the automated script, per the plan's manual cross-check requirement): `updateKota` rejects a rename that collides with an existing different city (`Kota dengan nama tersebut sudah ada.`) leaving Padang's data completely unchanged (no partial rename), and `prisma.kota.findUnique({ where: { nama: "Medan" }, include: { permintaan: true } })` independently confirms 2 related rows (PMT-002, PMT-010)

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared Prisma client singleton + Kota service layer with cascade-rename/block-delete** - `263c240` (feat)
2. **Task 2: Standalone verification script proving FK joins + referential-integrity rules end-to-end** - `324f5c3` (feat)

**Plan metadata:** skipped (commit_docs: false — temporary autonomous-run override for v2.0 Phases 6-10; SUMMARY.md/STATE.md/ROADMAP.md updated on disk only, not committed)

## Files Created/Modified

- `server/src/db/prismaClient.js` - Single shared `PrismaClient` instance, default-exported; the only `new PrismaClient()` call in the backend
- `server/src/services/kotaService.js` - 4 async functions: `getDaftarKota`, `getKotaReferenceCounts`, `updateKota` (transactional cascade-rename), `hapusKota` (block-delete-if-referenced)
- `server/src/services/kotaService.verify.mjs` - Standalone ESM verification script: FK-join proof, block-delete proof, cascade-rename proof (with self-revert for re-runnability), prints `FK_JOIN_OK`/`BLOCK_DELETE_OK`/`CASCADE_RENAME_OK` and exits non-zero on any failure

## Decisions Made

- Used `Promise.all` for the two independent count queries in `getKotaReferenceCounts` rather than sequential `await`s — no ordering dependency between the two reads
- `updateKota`'s transaction conditionally includes the 3 cascade `updateMany` calls only when the name actually changes, matching `store.js`'s own conditional cascade logic; a capacity-only edit still runs inside a transaction for consistency but skips the no-op cascade calls
- Chose Padang (not Pekanbaru, which is used for the block-delete test) as the verify script's cascade-rename test subject, exactly as the plan specified, to avoid the two tests' assertions colliding on re-run

## Deviations from Plan

None - plan executed exactly as written. Both files matched the plan's exact specification (function names, signatures, error messages, transaction structure) on the first implementation pass; the verify script passed all 3 checks on the first run with no debugging needed.

## Issues Encountered

None. The Postgres dev container (`switera-db-1`) and seeded data from Plans 01/02 were already running and intact, confirmed via `docker ps` before starting — no container restart or re-seed needed.

## User Setup Required

None - no external service configuration required. The Docker Postgres container and seed data from Plans 01/02 were already available in this environment.

## Next Phase Readiness

- `server/src/db/prismaClient.js` is ready to be imported by every future service module in Phase 7 (auth) and Phase 8 (domain CRUD) — no second `PrismaClient` instantiation should ever be created
- `server/src/services/kotaService.js` is ready to be wired into Phase 8's HTTP routes for the Kota CRUD endpoints with zero business-logic changes needed at the route layer
- The `prisma.$transaction([...])` cascade-rename pattern established here is reusable as a template for any other future multi-table cascade write
- This completes Phase 6 (Backend Skeleton & Data Model) — all 3 plans (06-01, 06-02, 06-03) are now done. Ready to proceed to Phase 7 (Auth).
- No blockers identified

## Self-Check: PASSED

- FOUND: server/src/db/prismaClient.js
- FOUND: server/src/services/kotaService.js
- FOUND: server/src/services/kotaService.verify.mjs
- FOUND: 263c240 (in git log)
- FOUND: 324f5c3 (in git log)
- `node src/services/kotaService.verify.mjs` prints `FK_JOIN_OK true`, `BLOCK_DELETE_OK true`, `CASCADE_RENAME_OK true`, exit code 0
- Re-ran the script a second time: identical `_OK true` output, exit code 0 (idempotency confirmed)
- Manual cross-check: `updateKota("Padang", { nama: "Medan", ... })` throws `Kota dengan nama tersebut sudah ada.`, Padang's kapasitas unchanged afterward
- Manual cross-check: `prisma.kota.findUnique({ where: { nama: "Medan" }, include: { permintaan: true } })` returns 2 rows (PMT-002, PMT-010), confirming the FK relation independent of the verify script

---
*Phase: 06-backend-skeleton-data-model*
*Completed: 2026-06-24*
