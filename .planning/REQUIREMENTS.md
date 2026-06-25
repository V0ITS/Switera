# Requirements: Switera

**Defined:** 2026-06-24
**Core Value:** The app must feel complete and trustworthy end-to-end for every role — every page works, every action persists and reflects instantly, and nothing looks unfinished or inconsistent.

## v1 Requirements

Requirements for Milestone v2.0 (Backend & Multi-User Migration). Each maps to roadmap phases. Derived from `.planning/research/SUMMARY.md`'s P1 ("Launch With") feature set.

### Database & Data Model

- [x] **DATA-01**: All 7 data domains (akun, daftarKota, permintaan, keputusan, riwayatKeputusan, activityLog, notifikasi) persist in PostgreSQL via a Prisma schema with correct foreign-key relationships
- [x] **DATA-02**: Existing seed data (JSON files + in-code seeds) is migrated into the database on first setup, with seed accounts' passwords bcrypt-hashed from the start — never an intermediate plaintext state
- [x] **DATA-03**: Renaming or deleting a city enforces the same referential-integrity rules as today (block-delete-if-referenced, cascade-rename) at the database/service layer, not just client-side

### Authentication & Authorization

- [x] **AUTH-01**: User can log in with username/password verified server-side via bcrypt comparison, receiving a signed JWT access token
- [x] **AUTH-02**: User can register a new account with a server-side-hashed password, replacing the current plaintext storage
- [x] **AUTH-03**: Every mutating API route enforces server-side role-based access control (RBAC) — a request from a role not permitted for that action is rejected with 403, regardless of what the client UI shows
- [x] **AUTH-04**: An expired or invalid JWT is rejected by the server with 401, requiring the user to log in again (no refresh-token flow in this milestone — see v2 Requirements)

### REST API & Validation

- [x] **API-01**: A REST endpoint exists for every CRUD operation currently performed via `store.js` methods, covering all 7 data domains
- [x] **API-02**: Every mutating endpoint validates its input server-side (Zod) and returns field-level error messages on invalid input, independent of client-side validation
- [x] **API-03**: The Express API is reachable from the Vite dev server via correctly configured CORS

### Business Logic Migration

- [x] **LOGIC-01**: The distribution-ranking/recommendation calculation (`computeRekomendasiDistribusi`) runs server-side, reading live data from the database, not client-cached state
- [x] **LOGIC-02**: Approving a distribution decision is guarded against race conditions — two concurrent approval requests for the same city cannot both succeed
- [x] **LOGIC-03**: Activity-log entries and notifications are generated server-side as part of the mutation that triggers them, not by the client

### Frontend Integration

- [x] **FE-01**: Every page that currently reads/writes `store.js` directly is updated to call the new REST API instead, with `store.js`'s existing public method names and `subscribe`/`notify` contract preserved (the "store-as-seam" pattern)
- [x] **FE-02**: Every API call that can be slow or fail shows a loading state and/or error message to the user — no page silently hangs or fails with no feedback
- [x] **FE-03**: All existing UI/UX (layout, copy, design system) is preserved exactly; this milestone changes only where data comes from, not how it looks

### Multi-Client Sync & Concurrency

- [x] **SYNC-01**: Two or more users logged in simultaneously (any combination of roles) see the same underlying data, reflected within a few seconds of any user's change, without manually refreshing the page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication & Authorization

- **AUTH-05**: Refresh-token flow (httpOnly cookie + `/auth/refresh` endpoint) so users aren't forced to re-login every time the short-lived access token expires
- **AUTH-06**: Refresh-token rotation with reuse detection (full production-grade session security) — overkill at school-project scale

### Multi-Client Sync & Concurrency

- **SYNC-02**: WebSocket/SSE-based real-time push instead of polling — only worth revisiting if a genuine sub-second collaboration requirement emerges

### Quality Infrastructure (carried from v1.0)

- **TEST-01**: Automated tests for `src/utils/distribusi.js`/`forecast.js` and the new backend services
- **SEC-01**: CSV injection sanitization review for user-entered city names

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| WebSocket/SSE real-time push for all data | Disproportionate complexity for this update frequency (manual form submissions, not high-frequency events) — polling is sufficient (SYNC-01) |
| Refresh-token rotation with reuse detection | Requires a persisted session store + replay detection — real engineering effort disproportionate to a 3-account, 3-role school demo |
| Pessimistic row-locking across the whole API | Solves a problem this app doesn't have; optimistic locking on the one race-prone stock-allocation path (LOGIC-02) is sufficient |
| Microservices / split deployments | Massive overhead for ~7 resources and a single Express process |
| Generic CRUD-generator / admin-panel framework (AdminJS, Forest Admin, etc.) | Conflicts with the "no rewrite of existing UI" constraint — hand-written routes matching `store.js`'s existing method surface are the right fit |
| New UI/visual design or design-system changes | The v1.0 design system carries over unchanged; this milestone is backend/data-layer only |
| New pages, roles, or business domains | Out of scope for this milestone |
| CI/CD pipeline or production deployment infrastructure | School project scope; local run (`npm run dev` + backend dev server) is sufficient |
| Mobile app / native clients | Web-first, out of scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 6 | Complete |
| DATA-02 | Phase 6 | Complete |
| DATA-03 | Phase 6 | Complete |
| AUTH-01 | Phase 7 | Complete |
| AUTH-02 | Phase 7 | Complete |
| AUTH-03 | Phase 7 | Complete |
| AUTH-04 | Phase 7 | Complete |
| API-01 | Phase 8 | Complete |
| API-02 | Phase 8 | Complete |
| API-03 | Phase 8 | Complete |
| LOGIC-01 | Phase 8 | Complete |
| LOGIC-02 | Phase 8 | Complete |
| LOGIC-03 | Phase 8 | Complete |
| FE-01 | Phase 9 | Complete |
| FE-02 | Phase 9 | Complete |
| FE-03 | Phase 9 | Complete |
| SYNC-01 | Phase 10 | Complete |

**Coverage:**

- v1 requirements: 17 total
- Mapped to phases: 17/17 ✓
- Unmapped: 0

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-06-24 after roadmap creation for Milestone v2.0 (Phases 6-10)*
