# Technology Stack

**Analysis Date:** 2026-07-01

## Languages

**Primary:**
- JavaScript (JSX) — React UI components and app logic, `src/**/*.jsx`, `src/**/*.js`
- JavaScript (ESM) — Express backend, `server/src/**/*.js`

**Secondary:**
- CSS — Design tokens and animations, `src/tokens.css`, `src/index.css`, `src/styles/animations.css`
- HTML — Single-page shell, `index.html`
- JSON — Static seed data + Prisma seeder, `src/data/*.json`, `server/prisma/seed.js`

No TypeScript — all files are `.js`/`.jsx` only, no type annotations, no `tsconfig.json`.

## Runtime

**Environment:**
- Node.js (version unpinned — no `.nvmrc`, no `engines` field in either `package.json`)
- Browser: modern evergreen (ES modules served directly via Vite, no ES5 transpile)

**Package Manager:**
- npm — two separate lockfiles: `package-lock.json` (root/frontend), `server/package-lock.json`
- Both packages declare `"type": "module"` (ESM throughout)

## Frameworks

**Frontend (root `package.json`):**
- React 18.3.1 — UI framework, function components + hooks, `src/pages/`, `src/components/`
- React DOM 18.3.1 — DOM renderer, mounted in `src/main.jsx`

**Backend (`server/package.json`):**
- Express 5.0.0 — HTTP API server, `server/src/index.js`

**Build/Dev:**
- Vite 7.0.0 — dev server + bundler, `vite.config.js`
- @vitejs/plugin-react 4.7.0 — React Fast Refresh / JSX transform

**Testing:**
- Not detected. No test runner, test config, or `*.test.*`/`*.spec.*` files exist.

## Key Dependencies

### Frontend

| Package | Version | Purpose | Used In |
|---------|---------|---------|---------|
| `react` | ^18.3.1 | UI runtime | `src/` |
| `react-dom` | ^18.3.1 | DOM renderer | `src/main.jsx` |
| `chart.js` | ^4.5.1 | Chart rendering | `src/pages/Dashboard.jsx`, `src/pages/Laporan.jsx`, `src/pages/AnalisisRanking.jsx` |
| `react-chartjs-2` | ^5.3.0 | React wrapper for Chart.js | Same pages as above |
| `leaflet` | ^1.9.4 | Interactive map | `src/components/PetaGeografis.jsx` |

### Backend

| Package | Version | Purpose | Used In |
|---------|---------|---------|---------|
| `express` | ^5.0.0 | HTTP API server | `server/src/index.js` |
| `@prisma/client` | 6.19.2 (pinned) | Prisma ORM client | `server/src/services/*` |
| `prisma` | 6.19.2 (pinned, devDep) | Migrations, generate, studio | CLI only |
| `bcryptjs` | ^2.4.3 | Password hashing | `server/src/services/akunService.js` |
| `jsonwebtoken` | ^9.0.2 | JWT sign/verify | `server/src/auth/jwt.js` |
| `zod` | ^3.23.8 | Request body validation | `server/src/middleware/` |
| `cors` | ^2.8.5 | CORS — locked to `http://localhost:5173` by default | `server/src/index.js` |
| `dotenv` | ^16.4.5 | Loads `server/.env` at startup | `server/src/index.js` (via `import "dotenv/config"`) |

## Configuration

**Backend environment (`server/.env`, gitignored):**
- `DATABASE_URL` — required; Prisma PostgreSQL connection string
- `JWT_SECRET` — required; used by `server/src/auth/jwt.js`
- `PORT` — optional; default `4000`
- `CORS_ORIGIN` — optional; default `http://localhost:5173`

**Frontend environment:**
- `VITE_API_BASE_URL` — optional; overrides backend base URL; defaults to `http://localhost:4000` (fallback in `src/api/apiClient.js:9`)
- No `.env` file exists for the frontend

**Config files:**
- `vite.config.js` — Vite plugin + dev server (host `0.0.0.0`, port `5173`)
- `server/prisma/schema.prisma` — Prisma schema, datasource, all models
- `docker-compose.yml` — Local PostgreSQL 16 container for development
- No `.eslintrc`, no `.prettierrc`, no `jsconfig.json`

## npm Scripts

### Frontend (root)
```bash
npm run dev    # vite — dev server on :5173
npm run build  # vite build — static bundle → dist/
```

### Backend (`server/`)
```bash
npm run dev             # node --watch src/index.js
npm run start           # node src/index.js
npm run prisma:migrate  # prisma migrate dev
npm run prisma:generate # prisma generate
npm run prisma:studio   # prisma studio (local GUI)
npm run db:seed         # node prisma/seed.js
```

## Platform Requirements

**Development startup order:**
1. `docker compose up -d` — start local PostgreSQL 16 on port 5432
2. `cd server && npm install && npm run prisma:migrate && npm run db:seed && npm run dev` — backend on :4000
3. `cd .. && npm install && npm run dev` — frontend on :5173

**Production:**
- Frontend: static `dist/` bundle from `npm run build`, served by any static host
- Backend: Node.js process (no bundle — must run `node src/index.js`)
- No CI/CD, no hosting-provider config detected

---

*Stack analysis: 2026-07-01*
