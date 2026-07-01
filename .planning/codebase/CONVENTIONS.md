# Coding Conventions

**Analysis Date:** 2026-07-01

## Naming Patterns

**Files:**
- React components: PascalCase matching the default export — `src/components/Tombol.jsx`, `src/components/MetricCard.jsx`, `src/pages/InputData.jsx`
- Hooks: camelCase prefixed with `use` — `src/hooks/useRipple.jsx`, `src/hooks/useMountSkeleton.js`
- Utility modules: camelCase, lowercase — `src/utils/format.js`, `src/utils/distribusi.js`, `src/utils/csv.js`
- Data seed files: camelCase `.json` — `src/data/permintaan.json`, `src/data/keputusan.json`
- Stylesheets: lowercase — `src/index.css`, `src/tokens.css`, `src/styles/animations.css`

**Functions:**
- Components: named `function` declarations (NOT arrow functions assigned to const)
- Helpers/utilities: `const` arrow functions — `src/utils/format.js:16` (`formatDate`), `src/store.js:18` (`clone`)
- Event handlers: camelCase prefixed with `handle` — `handleChange`, `handleSubmit` in `src/pages/InputData.jsx:88,98`
- Store mutators follow Indonesian verb prefixes: `tambah*` (add), `hapus*` (delete), `update*`, `get*`, `load*`, `set*`

**Variables:**
- camelCase throughout
- Boolean state flags prefixed with `is`: `isSaving`, `isLoading` — `src/pages/InputData.jsx:38`
- Domain collections prefixed with `daftar`: `daftarKota`, `daftarAkun`, `daftarPermintaan`
- Predominantly **Bahasa Indonesia** domain terms: `kota` (city), `tanggalPermintaan` (request date), `jumlahPermintaan` (request qty), `userAktif` (active user), `roleAktif`, `riwayatKeputusan` (decision history)

**Types/Shapes:**
- No TypeScript; shapes documented only by usage in JSON seed files and store seed constants
- Object shapes are flat and snake_case where they mirror DB columns (`tanggal_permintaan`, `tanggal_input`), camelCase everywhere else in frontend code

## Component Structure

Components follow a strict pattern — **always function declaration, export default at the bottom:**

```jsx
// src/components/Tombol.jsx
function Tombol({ label, variant = "primer", onClick, type = "button", disabled = false, isLoading = false, style }) {
  // hooks first
  const { ripples, onMouseDown, removeRipple } = useRipple();

  return (
    <button ...>
      {/* JSX */}
    </button>
  );
}

export default Tombol;  // always at bottom, never inline
```

Small private helper components (icons, sub-renders) are defined as named function declarations above the main component in the same file — e.g. `IkonCheck` in `src/pages/InputData.jsx:9-16`.

**Page component pattern:**
```jsx
function InputData({ onNavigate }) {
  // 1. useState declarations
  const [snapshot, setSnapshot] = useState(store.getState());
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 2. useEffect — subscribe to store
  useEffect(() => {
    const unsubscribe = store.subscribe((next) => setSnapshot(next));
    return unsubscribe;
  }, []);

  // 3. useEffect — load data on mount
  useEffect(() => { store.loadPermintaan(); store.loadKota(); }, []);

  // 4. useMemo for derived data
  const daftarKota = useMemo(() => snapshot.daftarKota ?? [], [snapshot.daftarKota]);

  // 5. local helpers / validation
  const validate = async (nextForm) => { ... };

  // 6. event handlers (handleChange, handleSubmit, etc.)
  const handleChange = async (field, value) => { ... };
  const handleSubmit = async (event) => { ... };

  // 7. return JSX
  return ( ... );
}

export default InputData;
```

## Import Organization

No enforced ordering. In practice, imports in pages follow this informal order:
1. React hooks (`import { useEffect, useMemo, useState } from "react"`)
2. Shared components (`import Card from "../components/Card"`)
3. Store (`import store from "../store"`)
4. Utilities (`import { parseCsvToObjects } from "../utils/csv"`)

No path aliases — all imports use relative paths (`../components/...`, `./pages/...`). No barrel `index.js` files.

## Code Style

- **Indentation:** 2 spaces
- **Quotes:** Double quotes for strings — `"primer"`, `"button"`, `"Menunggu"`
- **Semicolons:** Present at every statement end
- **Trailing commas:** Used in multi-line object/array literals
- **No linting tooling:** No `.eslintrc`, no `.prettierrc`, no `lint` script in `package.json` — consistency maintained by discipline only

## Error Handling

**Frontend — form validation:**
Returns an error object `{ field: message }` — never throws:

```jsx
// src/pages/InputData.jsx:56-86
const validate = async (nextForm) => {
  const nextErrors = {};
  if (!nextForm.kota) nextErrors.kota = "Nama kota wajib dipilih.";
  if (!nextForm.tanggalPermintaan) nextErrors.tanggalPermintaan = "Tanggal permintaan wajib diisi.";
  return nextErrors;
};
```

**Frontend — async store calls (standard pattern):**
```jsx
setIsSaving(true);
try {
  await store.addPermintaan({ ... });
  showToast({ type: "success", message: "..." });
  setForm(initialForm);
} catch (err) {
  showToast({ type: "error", message: err.message ?? "Terjadi kesalahan." });
} finally {
  setIsSaving(false);
}
```

**Frontend — localStorage access:**
`try/catch` with empty catch — failure degrades silently:
```js
// src/store.js:48-59
try {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
} catch {
  return null;
}
```

**Backend — service-layer errors:**
Services throw `Error` with Indonesian messages. Preferred pattern for new code:
```js
Object.assign(new Error("Data tidak ditemukan."), { statusCode: 404 })
```
Legacy pattern (pre-`statusCode`): `throw new Error("sudah ada")`, `throw new Error("tidak ditemukan")` — caught by `errorHandler.js` via string matching.

**Backend — `errorHandler.js` (`server/src/middleware/errorHandler.js`):**
- `err.statusCode` present → use it directly
- Message contains `"sudah ada"` or `"sudah digunakan"` → 409
- Message contains `"tidak bisa dihapus"` → 409
- Message contains `"tidak ditemukan"` → 404
- Anything else → 500 with generic `"Terjadi kesalahan pada server."` (never leaks stack traces)

**Backend — request validation (`server/src/middleware/validate.js`):**
`validate(schema)` wraps Zod schemas. On failure: 400 `{ error: "Validasi gagal.", fields: { <field>: <message> } }`. `req.body` is replaced with schema's parsed output — handlers must spread the validated DTO, never raw `req.body`, into Prisma.

## CSS / Styling Conventions

**Design tokens from `src/tokens.css`:**
All values are CSS custom properties on `:root`. Always use tokens — never hardcode literals.

Key token namespaces:
- Colors: `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-3`, `--color-primary`, `--color-accent`, `--color-danger`, `--color-success`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- Typography: `--text-xs` through `--text-4xl`, `--font-weight-normal/medium/semibold/bold`, `--font-display`, `--font-mono`
- Radius: `--radius-xs` through `--radius-2xl`, `--radius-full`
- Shadows: `--shadow-xs` through `--shadow-xl` — tuned for dark theme (opacity ~0.22–0.45). Do NOT write ad-hoc `boxShadow` literals; compose from these tokens.
- Easing: `--ease-out` (standard entrance), `--ease-bounce` (reserved, intentionally unused by default)

**Animation system (`src/styles/animations.css`):**
Single source of truth for shared keyframes. Use utility classes or reference named keyframes inline — do NOT define new per-component keyframe blocks:

```jsx
// Utility class approach
<div className="anim-fadeInUp">...</div>

// Inline animation referencing shared keyframe
style={{ animation: "fadeInUp16 500ms var(--ease-out) both" }}
```

Available shared keyframes: `fadeIn`, `fadeInUp16`, `fadeInDown`, `slideInRight`, `slideInLeft`, `scaleIn`, `shimmerSlide`, `pulse`, `spin`, `countUp`, `borderGlow`, `dotBounce`, `rowEnter`, `rowExit`.

`prefers-reduced-motion` is handled once globally in `animations.css` — no per-component media queries needed.

**Note:** `src/tokens.css` defines a few component-scoped keyframes (`fadeInUp` at 8px, `pageEnter`, `shimmer`) that are intentionally distinct from the similarly-named ones in `animations.css` — not duplicates to merge.

## Domain Language Reference

Indonesian terms used throughout the codebase:

| Term | Meaning |
|------|---------|
| `kota` | city |
| `permintaan` | request / demand |
| `keputusan` | distribution decision |
| `distribusi` | distribution |
| `tonase` / `jumlah` | tonnage / quantity |
| `daftar*` | list/collection — e.g. `daftarKota` |
| `userAktif` | currently logged-in user |
| `roleAktif` | active role |
| `tema` | UI theme (dark/light) |
| `riwayat*` | history — e.g. `riwayatKeputusan` |
| `stok` | stock |
| `laporan` | report |
| `akun` | account/user |
| `tambah*` | add — store mutator prefix |
| `hapus*` | delete — store mutator prefix |
| `update*` | update — store mutator prefix |
| `load*` | fetch from backend into cache |

## Module Exports

- **Components:** `export default ComponentName` only — no named exports from component files (except `Toast.jsx` which exports both `default useToast` and named `{ showToast, ToastContainer }`)
- **Utility modules:** named exports only, no default — `src/utils/format.js`, `src/utils/csv.js`
- **Singleton modules (store):** both default and named export of the same object — `src/store.js` (`export default store;` + `export const store = {...}`)

## Comments

Sparse. Used only to explain non-obvious defensive decisions — never describe WHAT the code does:

```js
// switera_session_v2 replaces the old switera_state_v1 domain blob: the
// server is now the source of truth for all DOMAIN collections (Phase 9
// hydrated in-memory cache decision). Only the session (active user) and
// the tema UI preference — never a backend concern — are persisted here.
// src/store.js:42-46
```

No JSDoc/TSDoc anywhere. No file-header comments. Backend middleware files use JSDoc-style block comments at the top to explain the middleware contract — `server/src/middleware/errorHandler.js:1-18`, `server/src/middleware/validate.js:1-15`.

---

*Convention analysis: 2026-07-01*
