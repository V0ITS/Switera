# Testing Patterns

**Analysis Date:** 2026-07-01

## Test Framework

**Runner:** None. No test framework installed.

No `*.test.*` or `*.spec.*` files exist anywhere in the repository. No test runner, no assertion library, no test config file (`jest.config.*`, `vitest.config.*`, etc.). No `test` script in `package.json` or `server/package.json`.

```json
// package.json scripts — no test entry
"scripts": {
  "dev": "vite",
  "build": "vite build"
}
```

## What Exists Instead of Tests

### 1. Zod Schema Validation (Backend)

The backend uses Zod schemas as the closest analogue to typed contract enforcement. Each route's request body is validated through `validate(schema)` middleware (`server/src/middleware/validate.js`). On schema mismatch, a 400 is returned with field-level messages before the handler runs.

This acts as an implicit integration guard: if a frontend caller sends the wrong shape, it gets an immediate structured error rather than a silent failure or DB exception.

### 2. Form-Level Validation (Frontend)

`src/pages/InputData.jsx:56-86` defines a `validate()` function that returns `{ field: message }` objects. This is called on every field change and before every submit — acting as a synchronous guard layer. The same pattern repeats across other form-bearing pages.

This is testable pure logic (no DOM dependency) but has no test coverage.

### 3. Store Clone Discipline

`src/store.js` returns deep clones (`JSON.parse(JSON.stringify(...))`) from all getters. This prevents accidental external mutation of cached state — a defensive pattern that compensates for lack of immutability enforcement.

### 4. Server-Side RBAC Middleware

`requireAuth` + `requireRole(...)` in `server/src/middleware/` act as runtime guards equivalent to access-control tests: any request with the wrong role receives a 403. This is implicitly tested every time a user navigates the app with a specific role.

### 5. Prisma Schema Constraints

`server/prisma/schema.prisma` declares unique constraints, foreign keys, and required fields. These act as data-integrity guards at the DB level — migrations will fail if the schema is violated.

## Manual Testing Approach

The app is verified manually by running it through role-based flows:

**Start the app:**
```bash
# Terminal 1 — backend
cd server && npm run dev       # Express on :4000

# Terminal 2 — frontend
npm run dev                    # Vite on :5173
```

**Role-based verification flows:**

| Role | Key flows to verify |
|------|-------------------|
| Admin | Login → ManajemenKota (add/delete city) → ManajemenData (manage accounts) → logout |
| Manajer Distribusi | Login → InputData (submit request) → KeputusanDistribusi (approve/reject) → AnalisisRanking → Laporan |
| Tim Logistik | Login → StatusDistribusi (update status: menunggu → dalam-pengiriman → selesai) → RiwayatAktivitas |

**Cross-cutting checks:**
- Switch roles: log out and back in as a different role — confirm menu items change and restricted pages return 403 from the backend
- Multi-user convergence: open two browser tabs logged in as different roles, make a mutation in one, wait ~4s (polling interval) and confirm the other tab updates
- Backend restart: with frontend running, restart the backend — confirm the frontend degrades gracefully and recovers when the backend returns

## Implicit Test Coverage Map

| Area | Coverage | Notes |
|------|----------|-------|
| Backend route auth (RBAC) | Runtime guard via middleware | Every request enforces `requireRole` |
| Request body shape | Runtime guard via Zod schemas | Invalid shapes → 400 before handler |
| DB integrity | Prisma schema constraints | Unique/FK violations → Prisma error → 409 |
| Frontend form validation | Manual + inline `validate()` | Logic is pure JS, easily unit-testable |
| Store cache hydration | Manual (role login flow) | `store.hydrate()` called on every login |
| Distribution ranking logic | Manual (AnalisisRanking page) | `src/utils/distribusi.js` is pure JS |
| Formatting utilities | Manual (inspect rendered values) | `src/utils/format.js` is pure JS |
| Animation/UI polish | Manual visual inspection | No DOM testing |
| Error states (network down) | Manual (kill backend) | No automated simulation |

## Gap Analysis — If Tests Were Added

The highest-value areas to add automated tests, in priority order:

**1. Pure utility functions (zero setup needed):**
- `src/utils/distribusi.js` — ranking algorithm, scoring logic
- `src/utils/forecast.js` — per-city demand forecasting
- `src/utils/format.js` — `formatDate`, `formatTonase`, `formatDateSingkat`
- `src/utils/csv.js` — `parseCsv`, `parseCsvToObjects`
- Frontend `validate()` functions in page components (extract to `src/utils/`)

These are plain JavaScript with no React/DOM/network dependencies. A single `vitest` install would cover them with no mocking needed.

**2. Backend route integration tests:**
- Auth: `POST /auth/login` with valid/invalid credentials
- RBAC: attempt a Manajer-only route as Tim Logistik → expect 403
- Duplicate detection: `POST /permintaan` twice same kota+date → expect 409
- Validation: `POST /permintaan` with missing fields → expect 400 with `fields`

Would require a test database (separate `DATABASE_URL`) and a test runner like `vitest` + `supertest`.

**3. Store hydration smoke test:**
- `store.hydrate()` resolves and populates `daftarKota`, `daftarPermintaan`, etc.
- Requires mocking `apiClient` fetch calls.

## Recommended Setup (If Adding Tests)

```bash
# Frontend utils — simplest path
npm install -D vitest
# Add to package.json: "test": "vitest run"
# Create src/utils/__tests__/distribusi.test.js, format.test.js, etc.

# Backend integration — requires more setup
cd server && npm install -D vitest supertest
# Create server/src/__tests__/routes/ directory
# Use a separate TEST_DATABASE_URL in server/.env.test
```

No test infrastructure currently exists. Any test addition starts from zero.

---

*Testing analysis: 2026-07-01*
