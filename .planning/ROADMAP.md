# Roadmap: Switera

## Milestones

- ✅ **v1.0 Completion & Polish** — Phases 1-5 (shipped 2026-06-24)
- 📋 **v2.0 Backend & Multi-User Migration** — Phases 6-10 (planned)

## Phases

<details>
<summary>✅ v1.0 Completion & Polish (Phases 1-5) — SHIPPED 2026-06-24</summary>

- [x] Phase 1: Admin City & Stock Management (3/3 plans) — completed 2026-06-21
- [x] Phase 2: Role-Differentiated Reporting (1/1 plans) — completed 2026-06-24
- [x] Phase 3: Validation & Edge-Case Completion (2/2 plans) — completed 2026-06-24
- [x] Phase 4: Auth & Landing Design-System Unification (2/2 plans) — completed 2026-06-24
- [x] Phase 5: Full Completeness Pass (1/1 plans) — completed 2026-06-24

Full detail archived at [`milestones/v1.0-ROADMAP.md`](./milestones/v1.0-ROADMAP.md).

</details>

### 📋 v2.0 Backend & Multi-User Migration (Planned)

**Milestone Goal:** Migrate Switera off `localStorage` onto a real backend (Node.js + Express + PostgreSQL via Prisma) with server-side authentication, enabling genuine multi-user concurrent access while preserving the existing "instant reflect, no refresh" UX and the v1.0 design system unchanged.

- [ ] **Phase 6: Backend Skeleton & Data Model** - Express + Prisma + PostgreSQL foundation with all 7 data domains migrated and seeded
- [ ] **Phase 7: Auth & Authorization** - Server-side JWT/bcrypt auth with real per-route RBAC enforcement
- [ ] **Phase 8: Domain CRUD Endpoints** - Full REST API parity with validated input, server-side ranking engine, and race-safe decision approval
- [ ] **Phase 9: Frontend API-Client Integration & Loading/Error UX** - Frontend calls the new API via the store-as-seam pattern with loading/error states everywhere
- [ ] **Phase 10: Multi-Client Sync & Cross-Role UAT** - Polling-based cross-client sync plus a full re-verification pass of auth and concurrency

## Phase Details

### Phase 6: Backend Skeleton & Data Model
**Goal**: A durable PostgreSQL source of truth exists, with all existing data and seed accounts migrated in, before any route or frontend code depends on it.
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Running the seed script against a fresh PostgreSQL database populates all 7 data domains (akun, daftarKota, permintaan, keputusan, riwayatKeputusan, activityLog, notifikasi) with the existing JSON seed data, queryable via Prisma Studio or `psql`.
  2. Every seed account in the database has a bcrypt hash in its password column — inspecting the table directly never shows a plaintext password, even immediately after seeding.
  3. Querying a city's related permintaan/keputusan/riwayatKeputusan rows via Prisma returns correctly joined results, confirming foreign-key relationships are wired correctly.
  4. Attempting to delete a city that is still referenced by an existing permintaan/keputusan/riwayatKeputusan row is rejected at the service layer; renaming a referenced city cascades the new name across all related rows — both verified independent of any frontend code (e.g., via a script or direct service call).
**Plans**: TBD

### Phase 7: Auth & Authorization
**Goal**: Users authenticate against the real backend, and every mutating route enforces role-based access control server-side, independent of what the client UI shows or hides.
**Depends on**: Phase 6
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A `curl`/Postman login request with a valid username/password receives a signed JWT access token; the same request with a wrong password is rejected, with the server comparing via bcrypt (not a plaintext match).
  2. A `curl`/Postman register request creates a new account whose password is stored bcrypt-hashed, never plaintext, at any point.
  3. A `curl`/Postman request to a mutating route using a valid JWT for a role not permitted for that action (e.g., Tim Logistik calling an Admin-only endpoint) is rejected with 403 — even though the same action might be hidden in the UI for that role.
  4. A `curl`/Postman request to a protected route with an expired or malformed JWT is rejected with 401, and the frontend's existing session is treated as invalid (forcing re-login) rather than silently retried.
**Plans**: TBD

### Phase 8: Domain CRUD Endpoints
**Goal**: Every domain operation the frontend needs has a real, validated, authorization-enforced REST endpoint — including the ranking engine and the one genuinely race-prone mutation (decision approval) — reachable from the Vite dev server.
**Depends on**: Phase 7
**Requirements**: API-01, API-02, API-03, LOGIC-01, LOGIC-02, LOGIC-03
**Success Criteria** (what must be TRUE):
  1. Every CRUD operation currently exposed via a `store.js` method (akun, daftarKota, permintaan, keputusan, riwayatKeputusan, activityLog, notifikasi) has a corresponding REST endpoint, verifiable end-to-end via `curl`/Postman without the frontend.
  2. Submitting invalid input to any mutating endpoint (e.g., a permintaan with a negative tonase, a kota rename to an empty string) returns a 4xx response with field-level error messages from server-side Zod validation, even if a malicious or buggy client sent no client-side validation at all.
  3. The Vite dev server's frontend origin can call the Express API directly in the browser without a CORS error in devtools.
  4. Calling the ranking/recommendation endpoint returns results computed from a fresh database read at request time (not a cached or client-supplied value) — verified by changing underlying data directly in the DB and confirming the next call reflects it.
  5. Firing two concurrent decision-approval requests for the same city's stock allocation (e.g., via two near-simultaneous `curl` calls or a small script) results in exactly one success and one rejected/conflicting response — never both succeeding and double-allocating stock.
  6. After any mutation that should trigger one (e.g., approving a decision, status change), a corresponding activity-log entry and/or notification row appears in the database immediately, generated by the server inside that same request — not requiring a separate client-side call.
**Plans**: TBD

### Phase 9: Frontend API-Client Integration & Loading/Error UX
**Goal**: Every page calls the real backend instead of local store state, with the existing UI/UX and the "instant reflect" feel preserved, and no call ever silently hangs or fails without visible feedback.
**Depends on**: Phase 8
**Requirements**: FE-01, FE-02, FE-03
**Success Criteria** (what must be TRUE):
  1. Every page that previously read/wrote `store.js` state directly now goes through `store.js`'s unchanged public method names and `subscribe`/`notify` contract, with those methods internally calling the new REST API — confirmed by network tab activity on actions that previously only touched localStorage.
  2. Any action that hits the network (e.g., submitting a form, loading a list) shows a visible loading indicator while in flight, and a Toast or inline error message if the request fails — no page appears to hang or do nothing on a slow or failed request.
  3. Navigating through every existing page (Dashboard, InputData, ManajemenData, KeputusanDistribusi, StatusDistribusi, AnalisisRanking, Laporan, RiwayatAktivitas, ManajemenKota, Landing, Login, Register) shows layout, copy, and design system pixel-identical to the v1.0 baseline — the only observable difference is that data now round-trips through the network.
**Plans**: TBD

### Phase 10: Multi-Client Sync & Cross-Role UAT
**Goal**: Multiple users across any combination of roles, logged in simultaneously from different clients, see the same underlying data converge within seconds of any change, with no manual refresh — and the authorization/concurrency guarantees from earlier phases hold up under real cross-role use.
**Depends on**: Phase 9
**Requirements**: SYNC-01
**Success Criteria** (what must be TRUE):
  1. With two browser sessions logged in as different users (any combination of the 3 roles), a data-changing action performed in one session (e.g., approving a decision, adding a request) is visible in the other session within a few seconds, without that second session reloading the page.
  2. Closing and reopening a tab, or leaving a page idle, does not desync a client permanently — the next poll cycle brings it back in line with the server's current state.
  3. Re-running the authorization-bypass `curl` test from Phase 7 (disallowed role on a mutating route) still returns 403 under multi-client load — polling did not introduce any new route that skips RBAC.
  4. Re-running the concurrent-approval test from Phase 8 with multiple real logged-in clients (not just direct `curl`) still results in exactly one successful allocation per contested city — the full stack, including polling, has no path that double-allocates stock.
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Admin City & Stock Management | v1.0 | 3/3 | Complete | 2026-06-21 |
| 2. Role-Differentiated Reporting | v1.0 | 1/1 | Complete | 2026-06-24 |
| 3. Validation & Edge-Case Completion | v1.0 | 2/2 | Complete | 2026-06-24 |
| 4. Auth & Landing Design-System Unification | v1.0 | 2/2 | Complete | 2026-06-24 |
| 5. Full Completeness Pass | v1.0 | 1/1 | Complete | 2026-06-24 |
| 6. Backend Skeleton & Data Model | v2.0 | 0/TBD | Not started | - |
| 7. Auth & Authorization | v2.0 | 0/TBD | Not started | - |
| 8. Domain CRUD Endpoints | v2.0 | 0/TBD | Not started | - |
| 9. Frontend API-Client Integration & Loading/Error UX | v2.0 | 0/TBD | Not started | - |
| 10. Multi-Client Sync & Cross-Role UAT | v2.0 | 0/TBD | Not started | - |
