<!-- refreshed: 2026-07-01 -->
# Architecture

**Analysis Date:** 2026-07-01

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     BROWSER (React 18 SPA)                       │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  src/pages/  │   │ src/components/ │   │  src/utils/      │  │
│  │  *.jsx       │──▶│  Layout.jsx     │   │  distribusi.js   │  │
│  │  (9 routes)  │   │  Card.jsx etc   │   │  forecast.js     │  │
│  └──────┬───────┘   └─────────────────┘   └──────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────┐                    │
│  │            src/store.js                  │                    │
│  │  (hydrated in-memory cache + pub/sub)    │                    │
│  └──────────────────────┬───────────────────┘                    │
│                         │                                        │
│         ┌───────────────▼──────────────────┐                     │
│         │        src/api/apiClient.js       │                     │
│         │  (fetch wrapper, JWT, 401 handle) │                     │
│         └───────────────┬──────────────────┘                     │
└─────────────────────────┼────────────────────────────────────────┘
                          │  HTTP/REST (localhost:4000)
                          │  Authorization: Bearer <JWT>
┌─────────────────────────▼────────────────────────────────────────┐
│                  EXPRESS 5 SERVER (server/)                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Middleware chain per request:                              │ │
│  │  cors → express.json → requireAuth → requireRole → validate │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  server/src/routes/*.js                                     │ │
│  │  authRoutes · kotaRoutes · permintaanRoutes · keputusan     │ │
│  │  stokRoutes · distribusiRoutes · notifikasi · activityLog   │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  server/src/services/*.js                                   │ │
│  │  akunService · kotaService · permintaanService · keputusan  │ │
│  │  stokService · distribusiService · notifikasiService        │ │
│  │  activityLogService                                         │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │  Prisma Client                     │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  server/prisma/schema.prisma → PostgreSQL 16                │ │
│  │  Models: Akun · Kota · Permintaan · Keputusan ·             │ │
│  │          RiwayatKeputusan · ActivityLog · Notifikasi · Stok  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Route resolution, auth-state machine, polling lifecycle | `src/App.jsx` |
| `store` | Hydrated in-memory cache + REST client facade, pub/sub | `src/store.js` |
| `apiClient` | fetch wrapper: JWT header, loading counter, 401 handler | `src/api/apiClient.js` |
| Page components | Full-route UI, local interaction state | `src/pages/*.jsx` |
| `Layout` | App shell: sidebar nav, header, notifications | `src/components/Layout.jsx` |
| `requireAuth` | Verifies Bearer JWT, attaches `req.user` | `server/src/middleware/requireAuth.js` |
| `requireRole` | Checks `req.user.role` against per-route allow-list | `server/src/middleware/requireRole.js` |
| `validate` | Zod schema validation middleware factory | `server/src/middleware/validate.js` |
| `errorHandler` | Central Express 4-arg error handler | `server/src/middleware/errorHandler.js` |
| Route files | HTTP route definitions, middleware composition | `server/src/routes/*.js` |
| Service files | Business logic + Prisma queries, source of truth | `server/src/services/*.js` |
| `jwt.js` | `signToken` / `verifyToken` (HS256, 1h expiry) | `server/src/auth/jwt.js` |

## Pattern Overview

**Overall:** Two-process REST architecture — browser SPA + stateful Express server backed by PostgreSQL. The frontend treats `store.js` as the data layer, but `store.js` is itself a hydrated cache that delegates all reads/writes to the backend.

**Key Characteristics:**
- No React Context, Redux, or Zustand — a single module-scoped singleton (`src/store.js`) is the entire frontend state
- Manual URL routing via `window.history.pushState` — no React Router
- Single source of truth: PostgreSQL via Prisma; frontend cache is always derived from a server response
- Real server-side RBAC (`requireAuth` + `requireRole` middleware); frontend role checks are purely cosmetic UX

## Layers

**Page Layer:**
- Purpose: Render a full route's UI and manage local interaction state (forms, modals, filters)
- Location: `src/pages/*.jsx`
- Contains: `Dashboard.jsx`, `InputData.jsx`, `ManajemenData.jsx`, `ManajemenKota.jsx`, `AnalisisRanking.jsx`, `KeputusanDistribusi.jsx`, `StatusDistribusi.jsx`, `Laporan.jsx`, `RiwayatAktivitas.jsx` (authenticated); `Landing.jsx`, `Login.jsx`, `Register.jsx` (unauthenticated)
- Depends on: `store` (direct import), shared components, `src/utils/*`
- Used by: `pageRegistry` in `src/App.jsx`

**Component Layer:**
- Purpose: Reusable UI primitives and app chrome
- Location: `src/components/*.jsx`
- Contains: `Layout.jsx` (app shell), `Card.jsx`, `Modal.jsx`, `Tabel.jsx`, `Toast.jsx`, `Tombol.jsx`, `MetricCard.jsx`, `PetaGeografis.jsx`, `Badge.jsx`, `Skeleton.jsx`, `Sparkline.jsx`, `ProgressBar.jsx`, `Tooltip.jsx`, `PageHeader.jsx`, `SectionHeader.jsx`, `EmptyState.jsx`, `CommandPalette.jsx`, `auth/AuthShared.jsx`
- Depends on: design tokens (`src/tokens.css`), animations (`src/styles/animations.css`); `Layout.jsx` and `Toast.jsx` also read `store` directly
- Used by: Page layer

**Store / Cache Layer:**
- Purpose: Hydrated in-memory cache + REST client facade; the frontend's only data-access path
- Location: `src/store.js`, `src/api/apiClient.js`
- Contains: module-scoped `state` object, `listeners` Set, `notify()`, async mutators, `hydrate()`, `startPolling()` / `stopPolling()`
- Depends on: `apiClient.js` for all HTTP; `localStorage` for session (`switera_session_v2`) and JWT (`switera_token`)
- Used by: Every authenticated page and several components via `import store from "../store"`

**Utility Layer:**
- Purpose: Pure business logic and formatting helpers, decoupled from React
- Location: `src/utils/`
- Contains: `distribusi.js` (ranking/recommendation calculations), `forecast.js` (per-city forecasting), `csv.js` (parse/download), `format.js` (date/number formatting), `waktu.js` (time helpers), `navigation.js` (role→menu mapping), `chartDefaults.js` (Chart.js global config)
- Depends on: Plain JS only — no React or store imports; these are the most testable units in the codebase
- Used by: Pages for KPI/ranking/chart computation; `navigation.js` used by `App.jsx` and `Layout.jsx`

**Backend Route Layer:**
- Purpose: HTTP route definitions, middleware composition, request/response shaping
- Location: `server/src/routes/*.js`
- Contains: `authRoutes.js`, `kotaRoutes.js`, `stokRoutes.js`, `permintaanRoutes.js`, `keputusanRoutes.js`, `distribusiRoutes.js`, `notifikasiRoutes.js`, `activityLogRoutes.js`, `roleOptions.js`
- Depends on: middleware stack, service layer, Zod schemas from `server/src/schemas/`
- Used by: `server/src/index.js` (mounted with `app.use(...)`)

**Backend Service Layer:**
- Purpose: Business logic + Prisma database access; the actual system of record
- Location: `server/src/services/*.js`
- Contains: `akunService.js` (bcrypt hashing/verification), `kotaService.js`, `permintaanService.js`, `keputusanService.js` (optimistic-lock updates via `updateMany`), `stokService.js`, `distribusiService.js` (ranking/KPI engine), `notifikasiService.js`, `activityLogService.js`
- Depends on: Prisma client (`server/src/db/prismaClient.js`), `jsonwebtoken`, `bcryptjs`
- Used by: Route handlers via direct import

## Data Flow

### Primary Read Path (login → page render)

1. User submits login form → `store.login()` → `POST /auth/login` (`server/src/routes/authRoutes.js`)
2. `akunService.verifyLogin()` checks bcrypt hash against `Akun` table (`server/src/services/akunService.js`)
3. `signToken({ id, username, role })` issues HS256 JWT with 1h expiry (`server/src/auth/jwt.js:28`)
4. Response `{ token, user }` received by `apiClient.js`; token stored in `localStorage` as `switera_token`; user written to `state.userAktif` via `store.setUserAktif()`
5. `App.jsx` effect on `snapshot.userAktif?.username` fires → calls `store.hydrate()` + `store.startPolling()` (`src/App.jsx:107-116`)
6. `hydrate()` runs `Promise.all` over 7 parallel `apiFetch` calls: `/kota`, `/stok-tbs`, `/permintaan`, `/keputusan`, `/riwayat-keputusan`, `/notifikasi`, `/activity-log` (`src/store.js:344-353`)
7. Each loader writes the server's response into `state` and calls `notify()`
8. All `store.subscribe()` listeners receive the snapshot → React re-renders with server data

### Write Path (mutation)

1. Page calls e.g. `store.tambahPermintaan({ ... })` (async mutator in `src/store.js`)
2. `runMutation(fn)` calls `apiFetch(path, { method: "POST", body })` with `Authorization: Bearer <token>`
3. Server middleware chain: `requireAuth` → `requireRole(...)` → `validate(zodSchema)` → route handler
4. Route handler calls service function → Prisma query; service also writes `ActivityLog`/`Notifikasi` rows in the same request
5. Route returns authoritative record(s) as JSON
6. `apiFetch` resolves; mutator writes server's response into `state`, calls `notify()`
7. All subscribers receive updated snapshot → UI re-renders
8. On any non-2xx: `apiFetch` throws `Error` with `.status`/`.fields`; `runMutation` calls `showToast({ type: "error" })` and re-throws; page `catch` maps field errors onto form state

### 4-Second Polling Path (SYNC-01)

1. After `hydrate()`, `store.startPolling()` calls `setInterval(pollTick, 4000)` (`src/store.js:154-163`)
2. Each `pollTick` calls `store.hydrate()` in `try/catch` — transient failures are silently swallowed; the interval keeps running (`src/store.js:169-182`)
3. On logout or 401, `App.jsx` effect cleanup calls `store.stopPolling()` → `clearInterval(pollIntervalId)`
4. All open browser sessions converge on server state within ~4 seconds without a page reload

## Auth / RBAC Flow

```text
POST /auth/login (no auth required)
  → akunService.verifyLogin() → bcrypt.compare()
  → signToken({ id, username, role }) → JWT (HS256, 1h)
  → client stores token in localStorage "switera_token"

Every subsequent authenticated request:
  Authorization: Bearer <token>
        ↓
  requireAuth (server/src/middleware/requireAuth.js)
    verifyToken() → jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] })
    → attaches req.user = { id, username, role }
    → 401 if missing/invalid/expired
        ↓
  requireRole("Admin", "Manajer Distribusi")  ← per-route allow-list
    → 403 if req.user.role not in list
        ↓
  validate(zodSchema)  (server/src/middleware/validate.js)
    → 400 with field errors if body invalid
        ↓
  Route handler → service → Prisma → PostgreSQL
        ↓
  errorHandler (server/src/middleware/errorHandler.js)
    → maps err.statusCode / known message strings → 409/404/500
    → never echoes err.stack to client
```

**Role-based write access (server-enforced):**

| Operation | Admin | Manajer Distribusi | Tim Logistik |
|-----------|-------|--------------------|--------------|
| Kota CRUD | Yes | No | No |
| Permintaan CRUD | Yes | No | No |
| Keputusan create / delete | Yes | Yes | No |
| Keputusan PUT (status update) | Yes | Yes | Yes |
| Stok update | Yes | No | No |
| All GET reads | Yes | Yes | Yes |

**Frontend gating:** `menuByRole` (`src/utils/navigation.js:7-33`) and `allowedPages` (`src/App.jsx:132-135`) hide unauthorized pages. This is UX-only — the server middleware is the actual security boundary.

## State Management

`src/store.js` is a hand-rolled module-scoped singleton:

```js
// Module-level — one instance per browser tab
const state = {
  userAktif: null,       // from localStorage on load, or login response
  roleAktif: "Admin",    // mirrors userAktif.role
  tema: "dark",          // UI theme, also persisted to localStorage
  daftarKota: [],        // hydrated from GET /kota
  stokTbs: 0,            // hydrated from GET /stok-tbs
  permintaan: [],        // hydrated from GET /permintaan
  keputusan: [],         // hydrated from GET /keputusan
  riwayatKeputusan: [],  // hydrated from GET /riwayat-keputusan
  notifikasi: [],        // hydrated from GET /notifikasi
  activityLog: [],       // hydrated from GET /activity-log
};

const listeners = new Set();
const notify = () => { persistState(); listeners.forEach(l => l(clone(state))); };
```

**Deep cloning:** `store.getState()` and most getters return `JSON.parse(JSON.stringify(value))` — external code cannot mutate the internal cache.

**Persistence:** Only `{ userAktif, tema }` are written to `localStorage` (`switera_session_v2`). All domain collections are re-hydrated from the server; they are never persisted to `localStorage`.

**Loading indicator:** `apiClient.js` maintains an `inFlightCount`; `store.js` subscribes via `subscribeLoading()` and writes `state.isLoading`. Pages read `snapshot.isLoading` with no extra wiring.

**Unauthorised handler:** `store.js` registers `setUnauthorizedHandler()` in `apiClient.js`. A 401 from any request triggers it: clears `state.userAktif`, removes the token, calls `notify()` → `App.jsx` redirects to `/` without any additional code.

## Key Abstractions

**`store` singleton:**
- Purpose: Facade that looks like the old "store as database" API but every mutator now round-trips the backend
- File: `src/store.js:246-514`
- Pattern: Module-level singleton + observer/pub-sub (`subscribe` / `listeners` / `notify`)

**`pageRegistry` / `pathByPage` / `pageByPath`:**
- Purpose: Maps string page keys to React components and URL paths (bidirectional)
- File: `src/App.jsx:19-45`
- Pattern: Plain object lookup tables — no router library

**`menuByRole` / `getDefaultMenuByRole`:**
- Purpose: Declares which page keys each role sees in the sidebar nav; used to compute redirect targets
- File: `src/utils/navigation.js`
- Pattern: Static config object; frontend UX-only

**Zod validation schemas:**
- Purpose: Request body validation reused by the `validate(schema)` middleware factory
- Files: `server/src/schemas/keputusanSchemas.js`, `kotaSchemas.js`, `permintaanSchemas.js`, `stokSchemas.js`
- Pattern: Named schema exports composed in route files

## Entry Points

**Browser:**
- Location: `src/main.jsx`
- Triggers: Page load (Vite serves `index.html`, loads this ESM module)
- Responsibilities: Mount `<App />` into `#root`

**`App` component:**
- Location: `src/App.jsx`
- Triggers: Every navigation event (pushState or `popstate`)
- Responsibilities: Resolve route + auth/role state → select page component to render; start/stop polling on login/logout; gate authenticated pages; render `<Layout>` wrapper

**Express server:**
- Location: `server/src/index.js`
- Triggers: `node server/src/index.js` (or `npm run dev` in `server/`)
- Responsibilities: Mount CORS, JSON body parser, all domain routers, central error handler; listen on `PORT` (default 4000)

## Architectural Constraints

- **No shared code across the process boundary:** `src/` and `server/` share no imports. Communication is HTTP only.
- **Single-threaded event loop:** The Node.js backend is single-threaded; all Prisma I/O is async/await.
- **Global singleton:** `state` in `src/store.js` is module-level — one instance per browser tab; multiple tabs are independent caches polling the same server.
- **Polling, not WebSocket:** Real-time sync uses 4s polling. True push (SSE/WebSocket) is deferred per `.planning/STATE.md` SYNC-02.
- **No error boundary:** No React `ErrorBoundary` component — an unhandled render error produces a blank page.
- **No tsconfig / no ESLint:** Conventions are maintained by discipline alone; there is no automated enforcement.

## Anti-Patterns

### Frontend role-check treated as a security boundary

**What happens:** `allowedPages` in `src/App.jsx` and `menuByRole` in `src/utils/navigation.js` determine which pages render.
**Why it's wrong:** A user could call any `store.*` mutator directly from the browser console regardless of their role; the frontend check does not stop the API call.
**Do this instead:** Always enforce with `requireRole(...)` middleware server-side (`server/src/middleware/requireRole.js`). The frontend checks are purely UX convenience.

### Reading `src/data/*.json` from authenticated pages

**What happens:** Pre-v2.0 pages read seed JSON files directly as their data source.
**Why it's wrong:** Data is stale, client-only, and not shared across users.
**Do this instead:** All authenticated pages must read from `store.getState()` (backed by the REST API). Only `src/pages/Landing.jsx` may read seed data for its pre-login static demo widgets.

## Error Handling

**Backend strategy:** Errors propagate from Prisma → service (throws `Error` with optional `.statusCode`) → route handler calls `next(err)` → `errorHandler` middleware maps to HTTP status and sanitized JSON body. Internal details never reach the client.

**Frontend strategy:** `apiFetch` throws `Error` with `.status` and optional `.fields`; `runMutation` catches, toasts the error, re-throws; pages catch the re-throw to map field-level errors onto form state.

**401 handling:** `apiClient.js` detects 401, clears the token, calls `onUnauthorized()` → store clears `userAktif` → `App.jsx` effect redirects to `/` automatically.

## Cross-Cutting Concerns

**Activity logging:** Backend services write `ActivityLog` and `Notifikasi` rows inside the same transaction as the triggering mutation. Frontend reads them via REST and surfaces them in `src/pages/RiwayatAktivitas.jsx` and the header notification dropdown (`src/components/Layout.jsx`).

**Request validation:** Centralized via Zod schemas (`server/src/schemas/*.js`) and the `validate(schema)` middleware factory (`server/src/middleware/validate.js`) — one place, no client-side schema validation library.

**Theme:** `tema` is persisted to `localStorage` (`switera_session_v2`). Applied to `<html data-theme="...">` by `src/App.jsx:118-121`. CSS custom properties in `src/tokens.css` are scoped to `[data-theme]` selectors.

---

*Architecture analysis: 2026-07-01*
