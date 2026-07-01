<!-- refreshed: 2026-07-01 -->
# Codebase Structure

**Analysis Date:** 2026-07-01

## Directory Layout

```
Switera/                          # Repo root — frontend project
├── src/                          # React SPA source
│   ├── main.jsx                  # DOM mount entry point
│   ├── App.jsx                   # Route orchestrator, auth state, polling
│   ├── store.js                  # Hydrated cache + REST client singleton
│   ├── tokens.css                # CSS custom-property design tokens
│   ├── index.css                 # Global base styles
│   ├── api/
│   │   └── apiClient.js          # fetch wrapper: JWT, loading, 401 handler
│   ├── pages/                    # One component per authenticated route
│   │   ├── Landing.jsx           # Pre-login marketing/demo page (route: /)
│   │   ├── Login.jsx             # Login form (route: /login)
│   │   ├── Register.jsx          # Registration form (route: /register)
│   │   ├── Dashboard.jsx         # Overview KPIs & charts (route: /dashboard)
│   │   ├── InputData.jsx         # Submit new permintaan (route: /input-data)
│   │   ├── ManajemenData.jsx     # Admin: edit/delete permintaan (route: /manajemen-data)
│   │   ├── ManajemenKota.jsx     # Admin: CRUD cities (route: /manajemen-kota)
│   │   ├── AnalisisRanking.jsx   # Manajer: ranking & recommendation (route: /analisis-ranking)
│   │   ├── KeputusanDistribusi.jsx # Manajer: approve/cancel decisions (route: /keputusan-distribusi)
│   │   ├── StatusDistribusi.jsx  # Logistik: update shipment status (route: /status-distribusi)
│   │   ├── Laporan.jsx           # Reports & charts (route: /laporan)
│   │   └── RiwayatAktivitas.jsx  # Activity log viewer (route: /riwayat-aktivitas)
│   ├── components/               # Shared UI primitives and app chrome
│   │   ├── Layout.jsx            # App shell: sidebar nav, header, notifications
│   │   ├── Card.jsx              # Generic card container
│   │   ├── Modal.jsx             # Dialog overlay
│   │   ├── Tabel.jsx             # Sortable/paginated data table
│   │   ├── Toast.jsx             # Toast notification system + useToast hook
│   │   ├── Tombol.jsx            # Button with ripple + loading state
│   │   ├── MetricCard.jsx        # KPI metric display card
│   │   ├── PageHeader.jsx        # Page title + breadcrumb header
│   │   ├── SectionHeader.jsx     # Section divider with title
│   │   ├── Badge.jsx             # Status/label badge
│   │   ├── EmptyState.jsx        # Empty list placeholder
│   │   ├── Skeleton.jsx          # Loading skeleton placeholder
│   │   ├── Sparkline.jsx         # Inline mini chart
│   │   ├── ProgressBar.jsx       # Progress/capacity bar
│   │   ├── Tooltip.jsx           # Hover tooltip
│   │   ├── CommandPalette.jsx    # Keyboard command palette
│   │   ├── PetaGeografis.jsx     # Leaflet map for geographic distribution
│   │   ├── IkonDaun.jsx          # SVG leaf icon (brand identity)
│   │   └── auth/
│   │       └── AuthShared.jsx    # Shared auth form elements
│   ├── utils/                    # Pure JS helpers — no React/store imports
│   │   ├── distribusi.js         # Ranking & recommendation calculation engine
│   │   ├── forecast.js           # Per-city TBS demand forecasting
│   │   ├── format.js             # Date, number, tonase formatting
│   │   ├── waktu.js              # Time/duration helpers
│   │   ├── csv.js                # CSV parse + download utilities
│   │   ├── navigation.js         # Role→menu mapping (menuByRole, getDefaultMenuByRole)
│   │   └── chartDefaults.js      # Chart.js global defaults (colors, fonts, plugins)
│   ├── hooks/                    # Custom React hooks
│   │   ├── useRipple.jsx         # Ripple click-effect hook
│   │   └── useMountSkeleton.js   # Skeleton show/hide on mount hook
│   ├── styles/
│   │   └── animations.css        # Shared keyframe animations + utility classes
│   └── data/                     # Static seed JSON — used only by seed script + Landing.jsx
│       ├── permintaan.json
│       ├── keputusan.json
│       └── (other seed files)
│
├── server/                       # Express backend — separate process
│   ├── package.json              # Backend dependencies (express, prisma, zod, etc.)
│   ├── src/
│   │   ├── index.js              # Express app setup, route mounting, error handler
│   │   ├── auth/
│   │   │   └── jwt.js            # signToken / verifyToken (HS256, 1h)
│   │   ├── db/
│   │   │   └── prismaClient.js   # Prisma singleton client instance
│   │   ├── middleware/
│   │   │   ├── requireAuth.js    # Verifies Bearer JWT → attaches req.user
│   │   │   ├── requireRole.js    # Checks req.user.role against allow-list
│   │   │   ├── validate.js       # Zod schema validation middleware factory
│   │   │   └── errorHandler.js   # Central 4-arg Express error handler
│   │   ├── routes/
│   │   │   ├── authRoutes.js     # POST /auth/login, POST /auth/register
│   │   │   ├── kotaRoutes.js     # GET/POST /kota, PUT/DELETE /kota/:nama
│   │   │   ├── stokRoutes.js     # GET /stok-tbs, PUT /stok-tbs
│   │   │   ├── permintaanRoutes.js # GET/POST /permintaan, PUT/DELETE /permintaan/:id
│   │   │   ├── keputusanRoutes.js  # GET/POST /keputusan, PUT/DELETE/:id, POST/:id/restore
│   │   │   ├── distribusiRoutes.js # GET /rekomendasi-distribusi, GET /kpi
│   │   │   ├── notifikasiRoutes.js # GET /notifikasi, PUT /notifikasi/:id/baca
│   │   │   ├── activityLogRoutes.js # GET /activity-log
│   │   │   └── roleOptions.js    # Exported array of valid role strings
│   │   ├── schemas/              # Zod request-body schemas
│   │   │   ├── keputusanSchemas.js
│   │   │   ├── kotaSchemas.js
│   │   │   ├── permintaanSchemas.js
│   │   │   └── stokSchemas.js
│   │   └── services/             # Business logic + Prisma access
│   │       ├── akunService.js    # Password hashing, login verification, registration
│   │       ├── kotaService.js    # City CRUD, reference-count check before delete
│   │       ├── permintaanService.js # Request CRUD + activity logging
│   │       ├── keputusanService.js  # Decision CRUD, optimistic-lock status update
│   │       ├── stokService.js    # Singleton TBS stock read/write
│   │       ├── distribusiService.js # Server-side ranking/KPI engine
│   │       ├── notifikasiService.js # Notification CRUD + mark-read
│   │       └── activityLogService.js # Activity log append + read
│   └── prisma/
│       ├── schema.prisma         # Prisma schema: 8 models, PostgreSQL datasource
│       ├── seed.js               # DB seeder (reads src/data/*.json)
│       └── migrations/           # Prisma migration history
│
├── index.html                    # Vite entry HTML: loads Inter/JetBrains Mono fonts
├── vite.config.js                # Vite + React plugin, dev server on 0.0.0.0:5173
├── package.json                  # Frontend deps + scripts: dev, build
├── package-lock.json             # Frontend lockfile
├── docker-compose.yml            # PostgreSQL 16 container for local dev
└── .planning/                    # Historical GSD phase artifacts (not maintained)
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One component per authenticated route; owns local form/modal/filter state
- Contains: 9 authenticated page components + 3 unauthenticated (`Landing`, `Login`, `Register`)
- Key pattern: Import `store` directly, read `snapshot` from `useState(store.getState())`, subscribe in `useEffect`

**`src/components/`:**
- Purpose: Shared UI primitives, app chrome, and the toast/notification system
- Key files: `Layout.jsx` (nav shell), `Tabel.jsx` (reusable sortable table), `Toast.jsx` (global toast + `showToast` imperatively callable), `Tombol.jsx` (button with built-in loading/ripple)
- Do not add page-specific logic here — components must remain generic

**`src/utils/`:**
- Purpose: Pure JS computation — no React, no store imports; importable anywhere including tests
- Key files: `distribusi.js` (ranking algorithm used by `AnalisisRanking`, `Dashboard`, `Laporan`), `format.js` (used everywhere for dates/numbers), `navigation.js` (used by `App.jsx` and `Layout.jsx`)

**`src/api/`:**
- Purpose: Single fetch abstraction; the only code path that calls the backend
- One file only: `src/api/apiClient.js`. Do not add more files here; extend `apiFetch` options if needed.

**`src/hooks/`:**
- Purpose: Reusable React hooks for UI behaviour (not data)
- `useRipple.jsx` — attach to button elements for material ripple effect
- `useMountSkeleton.js` — show skeleton on mount, hide after first data load

**`src/styles/`:**
- Purpose: Shared CSS keyframes and utility animation classes
- `animations.css` is the single source of truth for named keyframes (`fadeIn`, `fadeInUp16`, `slideInRight`, `rowEnter`, `shimmerSlide`, etc.)

**`src/data/`:**
- Purpose: Static seed JSON consumed only by `server/prisma/seed.js` and `src/pages/Landing.jsx` pre-login demo widgets
- Authenticated pages must NOT read from here; use `store.getState()` instead

**`server/src/routes/`:**
- Purpose: HTTP route definitions — compose middleware and call services
- Pattern: `requireAuth` then `requireRole(...)` then `validate(schema)` then async handler calling a service function and returning JSON

**`server/src/services/`:**
- Purpose: All real business logic and Prisma queries; the backend's equivalent of the old store
- Pattern: Named async function exports; throw `new Error(message)` with optional `.statusCode`; write `ActivityLog`/`Notifikasi` rows as side-effects inside the same service call

**`server/src/middleware/`:**
- Purpose: Cross-cutting request handling
- `requireAuth.js` — must come before `requireRole` on every protected route
- `validate.js` — call as `validate(zodSchema)` in the route chain after auth
- `errorHandler.js` — must be mounted last in `server/src/index.js`

**`server/prisma/`:**
- Purpose: Prisma schema, migration history, and DB seeder
- `schema.prisma` — 8 models: `Akun`, `Kota`, `Permintaan`, `Keputusan`, `RiwayatKeputusan`, `ActivityLog`, `Notifikasi`, `Stok`
- Run `npx prisma migrate dev` from `server/` to apply migrations
- Run `npm run db:seed` from `server/` to seed initial data from `src/data/*.json`

## Key File Locations

**Entry Points:**
- `src/main.jsx` — browser entry; mounts `<App />`
- `src/App.jsx` — route/auth orchestrator
- `server/src/index.js` — Express app + route mounting

**Configuration:**
- `vite.config.js` — Vite dev server (port 5173, all interfaces)
- `server/prisma/schema.prisma` — database schema
- `docker-compose.yml` — local PostgreSQL 16 container
- `server/.env` (gitignored) — `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`

**Core Logic:**
- `src/store.js` — frontend state singleton
- `src/api/apiClient.js` — fetch wrapper
- `server/src/auth/jwt.js` — token sign/verify
- `server/src/middleware/requireAuth.js` — auth guard
- `server/src/middleware/requireRole.js` — RBAC guard

**Design System:**
- `src/tokens.css` — all CSS custom properties (colors, spacing, shadows, radii, typography)
- `src/styles/animations.css` — all shared keyframes and animation utility classes
- `src/index.css` — global base styles and resets

**Business Logic:**
- `src/utils/distribusi.js` — TBS ranking and recommendation engine (client-side, pure JS)
- `server/src/services/distribusiService.js` — server-side equivalent (KPI, rekomendasi endpoints)
- `server/src/services/keputusanService.js` — optimistic-lock decision status updates

## Naming Conventions

**Files:**
- React components: PascalCase `.jsx` — `MetricCard.jsx`, `KeputusanDistribusi.jsx`
- Hooks: camelCase `.jsx` or `.js` prefixed `use` — `useRipple.jsx`, `useMountSkeleton.js`
- Utilities: camelCase `.js` — `distribusi.js`, `format.js`
- Backend route files: camelCase `*Routes.js` — `kotaRoutes.js`
- Backend service files: camelCase `*Service.js` — `kotaService.js`
- Backend schema files: camelCase `*Schemas.js` — `keputusanSchemas.js`

**Directories:**
- Lowercase, no hyphens: `pages/`, `components/`, `utils/`, `routes/`, `services/`, `middleware/`

## Where to Add New Code

**New authenticated page:**
1. Create `src/pages/NamaHalaman.jsx` (PascalCase, named function declaration + `export default`)
2. Add to `pageRegistry`, `pathByPage` in `src/App.jsx:19-44`
3. Add to the appropriate role(s) in `menuByRole` in `src/utils/navigation.js`
4. Add the backend route(s) in `server/src/routes/` with `requireAuth` + `requireRole`
5. Add business logic in `server/src/services/`

**New shared component:**
- Add to `src/components/NamaKomponen.jsx`
- Export only a default export (named function declaration)
- Keep it generic — no page-specific logic or direct store reads unless absolutely necessary (only `Layout` and `Toast` read `store` today)

**New utility function:**
- Add to the relevant file in `src/utils/` (or create a new `src/utils/namaUtil.js`)
- Use named exports; no default export
- No React or store imports — keep utils pure JS

**New backend route + service:**
1. Create `server/src/services/namaService.js` (business logic + Prisma)
2. Create `server/src/schemas/namaSchemas.js` (Zod schemas if needed)
3. Create `server/src/routes/namaRoutes.js` (chain `requireAuth` → `requireRole` → `validate` → handler)
4. Mount the router in `server/src/index.js` with `app.use("/nama", namaRouter)` before `app.use(errorHandler)`
5. Add hydration loader to `store.hydrate()` in `src/store.js`

**New database model:**
1. Add model to `server/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe-change` from `server/`
3. Add service functions in `server/src/services/`

## Special Directories

**`.planning/`:**
- Purpose: Historical GSD phase artifacts from v1.0/v2.0 milestones
- Generated: No (hand-written during planning phases)
- Committed: Yes (historical reference only; not actively maintained going forward)

**`server/prisma/migrations/`:**
- Purpose: Prisma migration history — one subdirectory per migration with SQL
- Generated: Yes (by `prisma migrate dev`)
- Committed: Yes (required for team consistency and production deploys)

**`node_modules/` (root and `server/`):**
- Generated: Yes (npm install)
- Committed: No

**`dist/` (root):**
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No

---

*Structure analysis: 2026-07-01*
