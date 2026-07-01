# External Integrations

**Analysis Date:** 2026-07-01

## Frontend ↔ Backend REST API

The frontend communicates with the backend exclusively through `src/api/apiClient.js` (`apiFetch`). Every page and store mutator uses this single path — Authorization header, error normalization, and 401 handling are applied once here.

**Base URL:** `http://localhost:4000` (default) or `VITE_API_BASE_URL` env override.

**Auth mechanism:** JWT Bearer token. Token is stored in `localStorage` under key `switera_token`. Every authenticated request includes `Authorization: Bearer <token>`. A 401 response clears the token and fires an unauthorized handler registered by `src/store.js`.

### API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/auth/login` | No | Any | Username/password/role login → returns JWT + user object |
| POST | `/auth/register` | No | Any | Register new account |
| GET | `/health` | No | Any | Health check → `{ status: "ok" }` |
| GET | `/kota` | Yes | Any | List all cities |
| POST | `/kota` | Yes | Admin | Create city |
| PUT | `/kota/:nama` | Yes | Admin | Update city |
| DELETE | `/kota/:nama` | Yes | Admin | Delete city |
| GET | `/stok-tbs` | Yes | Any | Get current TBS stock singleton |
| PUT | `/stok-tbs` | Yes | Admin, Manajer Distribusi | Update TBS stock |
| GET | `/permintaan` | Yes | Any | List all requests |
| POST | `/permintaan` | Yes | Tim Logistik, Admin | Create request |
| PUT | `/permintaan/:id` | Yes | Tim Logistik, Admin | Update request |
| DELETE | `/permintaan/:id` | Yes | Admin | Delete request |
| GET | `/keputusan` | Yes | Any | List active distribution decisions |
| POST | `/keputusan` | Yes | Manajer Distribusi, Admin | Create decision |
| PUT | `/keputusan/:id/status` | Yes | Manajer Distribusi, Tim Logistik, Admin | Advance decision status |
| DELETE | `/keputusan/:id` | Yes | Admin | Delete decision |
| GET | `/riwayat-keputusan` | Yes | Any | List completed decision history |
| GET | `/rekomendasi-distribusi` | Yes | Any | Ranking-based distribution recommendations |
| GET | `/kpi` | Yes | Any | KPI metrics for dashboard |
| GET | `/notifikasi` | Yes | Any | List notifications for current session |
| PUT | `/notifikasi/:id/baca` | Yes | Any | Mark notification as read |
| GET | `/activity-log` | Yes | Any | List activity log entries |

### Router Files

| Router | File |
|--------|------|
| Auth | `server/src/routes/authRoutes.js` |
| Kota | `server/src/routes/kotaRoutes.js` |
| Stok TBS | `server/src/routes/stokRoutes.js` |
| Permintaan | `server/src/routes/permintaanRoutes.js` |
| Keputusan | `server/src/routes/keputusanRoutes.js` |
| Distribusi (rekomendasi + KPI) | `server/src/routes/distribusiRoutes.js` |
| Notifikasi | `server/src/routes/notifikasiRoutes.js` |
| Activity Log | `server/src/routes/activityLogRoutes.js` |

### Frontend Data Flow

1. `src/App.jsx` calls `store.hydrate()` on login/session-restore
2. `store.hydrate()` (`src/store.js`) `Promise.all`s every domain loader — each calls `apiFetch`
3. Synchronous getters (`store.getDaftarKota()`, etc.) return deep clones of the in-memory cache
4. Mutators are `async`, call `apiFetch`, then write the server's authoritative response into the cache and call `notify()` to re-render subscribers
5. `store.startPolling()` / `stopPolling()` polls the backend every 4 seconds (`pollTick`) to sync multi-user changes — no WebSocket/SSE

## Database

**Provider:** PostgreSQL 16 (local Docker: `docker-compose.yml`; connection via `DATABASE_URL`)

**ORM:** Prisma 6.19.2 — schema at `server/prisma/schema.prisma`, migrations in `server/prisma/migrations/`

### Models

| Model | Primary Key | Description |
|-------|-------------|-------------|
| `Akun` | `id: String` | User accounts; passwords bcrypt-hashed; `role` is one of `Admin`, `Manajer Distribusi`, `Tim Logistik` |
| `Kota` | `nama: String` | Cities; `kapasitas: Int`; parent of `Permintaan`, `Keputusan`, `RiwayatKeputusan` |
| `Permintaan` | `id: String` | Distribution requests; FK to `Kota.nama` |
| `Keputusan` | `id: String` | Active distribution decisions; FK to `Kota.nama`; has lifecycle timestamps |
| `RiwayatKeputusan` | `id: String` | Completed/archived decisions; same shape as `Keputusan` |
| `ActivityLog` | `id: String` | Audit trail; `aktor`, `role`, `aksi`, `waktu` |
| `Notifikasi` | `id: String` | UI notifications; `dibaca: Boolean` |
| `Stok` | `id: String` ("singleton") | Singleton row for current TBS stock value |

**Seeder:** `server/prisma/seed.js` — populates initial accounts, cities, and stock from `src/data/*.json` seed files.

## Authentication & Authorization

**Auth mechanism:**
- `POST /auth/login` checks bcrypt hash server-side (`bcryptjs` via `server/src/services/akunService.js`)
- On success: `server/src/auth/jwt.js` issues a signed JWT (payload: `{ id, username, role }`)
- Frontend stores token in `localStorage` (`switera_token` key) via `src/api/apiClient.js`
- All authenticated requests send `Authorization: Bearer <token>`

**RBAC middleware:**
- `server/src/middleware/requireAuth.js` — verifies JWT, attaches `req.user`; returns 401 if missing/invalid
- `server/src/middleware/requireRole(...roles)` — checks `req.user.role`; returns 403 if role not in allowed list
- Applied per-route in each router file

**Security note (from `server/.env`):** JWT is stored in `localStorage` (XSS-exposure tradeoff accepted for school demo; refresh-token rotation deferred — documented in `.planning/STATE.md` as threat T-09-JWT / AUTH-05/06).

## Third-Party Libraries (client-side)

**Leaflet ^1.9.4:**
- Library: client-side interactive map rendering
- Used in: `src/components/PetaGeografis.jsx`
- External dependency: OpenStreetMap tile server (loaded at runtime if tile layer is configured)
- No API key required for OSM tiles

**Chart.js ^4.5.1 + react-chartjs-2 ^5.3.0:**
- Purpose: bar/line/pie charts in dashboard and analytics pages
- Used in: `src/pages/Dashboard.jsx`, `src/pages/Laporan.jsx`, `src/pages/AnalisisRanking.jsx`
- Configured centrally: `src/utils/chartDefaults.js`
- No external service — renders entirely in-browser

**Google Fonts:**
- Inter and JetBrains Mono loaded via `<link>` tags in `index.html`
- No API key; plain CDN stylesheet request at page load

## Docker (Local Development Database)

**File:** `docker-compose.yml` (repo root)

```
Service: db
Image: postgres:16
Port: 5432:5432
Credentials: POSTGRES_USER=switera / POSTGRES_PASSWORD=switera_dev_password / POSTGRES_DB=switera
Volume: switera_pgdata (named, persists between restarts)
```

These credentials are dev-only defaults. The backend reads `DATABASE_URL` from `server/.env` — set this to match the Docker defaults: `postgresql://switera:switera_dev_password@localhost:5432/switera`.

## Environment Variables Summary

| Var | Location | Required | Default | Notes |
|-----|----------|----------|---------|-------|
| `DATABASE_URL` | `server/.env` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | `server/.env` | Yes | — | JWT signing secret |
| `PORT` | `server/.env` | No | `4000` | Express listen port |
| `CORS_ORIGIN` | `server/.env` | No | `http://localhost:5173` | Allowed CORS origin |
| `VITE_API_BASE_URL` | frontend env | No | `http://localhost:4000` | Backend base URL override |

## Monitoring & Observability

**Error Tracking:** None (no Sentry, LogRocket, etc.)

**Logs:** Default `console.log`/`console.error` only — no Winston/Pino or structured logging on the backend.

**Activity Log:** `ActivityLog` model in PostgreSQL is a first-class UI feature (not an ops tool); written inside backend service calls alongside domain mutations; surfaced in `src/pages/RiwayatAktivitas.jsx` and the header notification dropdown.

## CI/CD & Deployment

**Hosting:** Not configured — no Vercel, Netlify, Firebase, or similar config files.

**CI Pipeline:** None — no `.github/workflows/` or other CI config.

**Webhooks — Incoming:** None.

**Webhooks — Outgoing:** None.

---

*Integration audit: 2026-07-01*
