# Phase 1: Admin City & Stock Management - Pattern Map

**Mapped:** 2026-06-21
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/pages/ManajemenKota.jsx` (NEW) | component (page) | CRUD | `src/pages/ManajemenData.jsx` | exact (same snapshot-subscribe + Tabel/Modal CRUD shape) |
| `src/store.js` (`updateKota`, `hapusKota`, `getKotaReferenceCounts`) | service (store mutator) | CRUD + event-driven (notify/subscribe) | `src/store.js` (`tambahKota`, `addKeputusan`/`removeKeputusan`) | exact (same file, same mutator family) |
| `src/utils/navigation.js` (`menuByRole.Admin` entry) | config | request-response (lookup table) | `src/utils/navigation.js` (existing `Admin` array entries) | exact |
| `src/App.jsx` (`pageRegistry`, `pathByPage` entries) | route/config | request-response (lookup table) | `src/App.jsx` (existing entries for `manajemen-data`) | exact |
| `src/components/Layout.jsx` (`IkonMenu` new `"city"` case) | component (presentational) | transform (render icon by type) | `src/components/Layout.jsx` (`case "database"` / `case "report"`) | exact |

## Pattern Assignments

### `src/pages/ManajemenKota.jsx` (component/page, CRUD) — NEW FILE

**Analog:** `src/pages/ManajemenData.jsx` (full file read, 567 lines) and `src/pages/InputData.jsx` (lines 1-130, validate/submit shape)

**Imports pattern** (`ManajemenData.jsx:1-12`):
```jsx
import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import { showToast } from "../components/Toast";
import useRipple, { RippleSpans } from "../hooks/useRipple";
import store from "../store";
import { formatDate } from "../utils/format";
```
For `ManajemenKota.jsx`, add `import MetricCard from "../components/MetricCard";` (per D-04 stock card) — no `formatDate` needed unless used for activity timestamps.

**Snapshot-subscribe pattern** (`ManajemenData.jsx:60,71-77,79`):
```jsx
const [snapshot, setSnapshot] = useState(store.getState());
// ...
useEffect(() => {
  const unsubscribe = store.subscribe((nextSnapshot) => {
    setSnapshot(nextSnapshot);
  });
  return unsubscribe;
}, []);

const daftarKota = useMemo(() => snapshot.daftarKota ?? [], [snapshot.daftarKota]);
```
Apply identically for `ManajemenKota.jsx`; also derive `const stokTbs = snapshot.stokTbs ?? 0;` directly from `snapshot` (never call `store.getStokTbs()` inside render — Pitfall 5 in RESEARCH.md).

**Reusable AksiTabelButtons component** (`ManajemenData.jsx:23-57`) — copy verbatim, it is presentational only, no `permintaan`-specific logic; reuse for Edit/Hapus row actions in the new Tabel.

**Validate + submit + catch-thrown-error pattern** (`InputData.jsx:51-81` for `validate`, `ManajemenData.jsx:111-142,167-186` for `saveEdit`):
```jsx
// validate(form) -> {field: message}, called on every change AND before submit
const validateForm = (nextForm) => {
  const nextErrors = {};
  if (!nextForm.nama.trim()) {
    nextErrors.nama = "Nama kota wajib diisi.";
  }
  if (!nextForm.kapasitas || Number(nextForm.kapasitas) <= 0) {
    nextErrors.kapasitas = "Kapasitas harus berupa angka positif.";
  }
  return nextErrors;
};
```

**Error handling pattern — catching store's thrown `Error`** (this is the ONE place `ManajemenData.jsx`/`InputData.jsx` differ from what's needed; `tambahKota` is the first store mutator in this codebase that throws on a business-rule violation, so model the catch block on D-05's explicit requirement, not on any existing try/catch since neither `ManajemenData.jsx` nor `InputData.jsx` currently wrap a throwing mutator):
```jsx
try {
  if (editTarget) {
    store.updateKota(editTarget.nama, { nama: form.nama.trim(), kapasitas: form.kapasitas });
    showToast({ type: "success", message: "Kota berhasil diperbarui." });
  } else {
    store.tambahKota({ nama: form.nama.trim(), kapasitas: form.kapasitas });
    showToast({ type: "success", message: "Kota berhasil ditambahkan." });
  }
  setIsFormOpen(false);
} catch (error) {
  // D-05: inline under the `nama` field, NEVER a toast for this error
  setFormErrors({ nama: error.message });
}
```

**Delete-confirm + Tabel + EmptyState pattern** (`ManajemenData.jsx:188-207,386-412,517-561`):
```jsx
{tableRows.length > 0 ? (
  <Tabel kolom={[...]} data={tableRows} aksi={(baris) => (
    <AksiTabelButtons onEdit={() => openEditModal(currentItem)} onDelete={() => requestDelete(currentItem)} />
  )} />
) : (
  <EmptyState pesan="Belum ada kota yang terdaftar." />
)}
```
For `ManajemenKota.jsx`, `requestDelete` must branch on `store.getKotaReferenceCounts(nama)` BEFORE opening the standard delete-confirm modal (see Pattern 3 below) — this is new logic with no direct precedent in `ManajemenData.jsx` (which has no block-delete concept), so build it from RESEARCH.md Pattern 3's exact snippet, not from an existing page.

**Modal usage pattern** (`ManajemenData.jsx:415-515,517-561`) — copy the `<Modal judul=... onTutup=... konten={...} />` shape exactly for: (1) add/edit form modal, (2) delete-confirm modal, (3) NEW: delete-blocked notice modal (single "Mengerti" button, no destructive action), (4) NEW: stock-edit modal (single field, D-04).

**Stock summary card pattern** (no existing page uses `MetricCard size="lg"` with a `children` edit button this exact way — compose from `MetricCard.jsx:150-257` props directly):
```jsx
<MetricCard label="Stok TBS Tersedia (ton)" nilai={`${stokTbs} ton`} size="lg" accent="primary">
  <Tombol label="Edit" variant="sekunder" onClick={openStockModal} />
</MetricCard>
```

---

### `src/store.js` (service/store mutator, CRUD + event-driven) — MODIFY

**Analog (same file):** `tambahKota` (`store.js:247-256`), `updateKota` (`store.js:258-265`), `hapusKota` (`store.js:267-272`)

**Current code to extend — `updateKota`** (`store.js:258-265`):
```js
updateKota(namaLama, { nama, kapasitas }) {
  state.daftarKota = state.daftarKota.map((kota) =>
    kota.nama === namaLama ? { nama, kapasitas: Number(kapasitas) || 0 } : kota
  );
  recordActivity(`Memperbarui data kota ${namaLama}`);
  notify();
  return clone(state.daftarKota);
},
```
**Extension required (D-02 cascade-rename)** — add, before `recordActivity`/`notify()`, a block that rewrites `state.permintaan[].kota` and `state.keputusan[]`/`state.riwayatKeputusan[].kota_tujuan` when `nama !== namaLama`. Single mutation, single `notify()` at the end — matches the project's universal convention (every mutator in `store.js` calls `notify()` exactly once, confirmed via grep across lines 133-509).

**Current code to extend — `hapusKota`** (`store.js:267-272`):
```js
hapusKota(nama) {
  state.daftarKota = state.daftarKota.filter((kota) => kota.nama !== nama);
  recordActivity(`Menghapus kota ${nama} dari daftar kota`);
  notify();
  return clone(state.daftarKota);
},
```
**Extension required (D-01 block-delete)** — add a guard at the top that throws if referenced, mirroring `tambahKota`'s only-throwing-mutator precedent (`store.js:248-250`):
```js
tambahKota({ nama, kapasitas }) {
  if (state.daftarKota.some((kota) => kota.nama === nama)) {
    throw new Error("Kota dengan nama tersebut sudah ada.");
  }
  state.daftarKota = [...state.daftarKota, { nama, kapasitas: Number(kapasitas) || 0 }];
  recordActivity(`Menambahkan kota ${nama} ke daftar kota`);
  notify();
  return clone(state.daftarKota);
},
```
Add new read-only helper `getKotaReferenceCounts(nama)` near `getKapasitasKota` (`store.js:243-245`):
```js
getKapasitasKota(namaKota) {
  return state.daftarKota.find((kota) => kota.nama === namaKota)?.kapasitas ?? null;
},
```
New method follows this exact shape (plain read, no mutation, no `notify()`):
```js
getKotaReferenceCounts(nama) {
  const permintaanCount = state.permintaan.filter((item) => item.kota === nama).length;
  const keputusanCount = state.keputusan.filter((item) => item.kota_tujuan === nama).length;
  return { permintaanCount, keputusanCount };
},
```

**Cross-collection divergence to respect** (`store.js:443-464`, `removeKeputusan`/`restoreKeputusan`) — `keputusan` and `riwayatKeputusan` diverge once a decision is cancelled/restored; the cascade-rename (D-02) MUST touch all three collections (`permintaan`, `keputusan`, `riwayatKeputusan`); the block-delete check (D-01) intentionally counts only `state.keputusan` (active) per Assumption A1 in RESEARCH.md — confirmed as the phase's working interpretation, not left ambiguous.

**`recordActivity`/`notify()` convention** (used identically by every mutator, e.g. `store.js:253-254,262-263,269-270,281-282`) — call `recordActivity(...)` then `notify()` exactly once at the very end of the mutator, after all state assignments, never inside a loop or multiple times per call.

---

### `src/utils/navigation.js` (config, request-response) — MODIFY

**Analog (same file):** existing `menuByRole.Admin` array (`navigation.js:7-13`)

**Current code:**
```js
export const menuByRole = {
  Admin: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "input-data", label: "Input Data", icon: "input" },
    { key: "manajemen-data", label: "Manajemen Data", icon: "database" },
    { key: "riwayat-aktivitas", label: "Riwayat Aktivitas", icon: "report" },
  ],
  // ...
};
```
**Pattern to copy:** insert one new object literal `{ key: "manajemen-kota", label: "Manajemen Kota", icon: "city" }` into the `Admin` array (position per Claude's Discretion — RESEARCH.md places it after `"manajemen-data"`, before `"riwayat-aktivitas"`). Do NOT touch `"Manajer Distribusi"`/`"Tim Logistik"` arrays — Admin-only page per D-03.

---

### `src/App.jsx` (route/config, request-response) — MODIFY

**Analog (same file):** existing `pageRegistry`/`pathByPage` entries (`App.jsx:18-38`)

**Current code:**
```jsx
import ManajemenData from "./pages/ManajemenData";
// ...
const pageRegistry = {
  dashboard: Dashboard,
  "input-data": InputData,
  "manajemen-data": ManajemenData,
  "analisis-ranking": AnalisisRanking,
  "keputusan-distribusi": KeputusanDistribusi,
  "status-distribusi": StatusDistribusi,
  laporan: Laporan,
  "riwayat-aktivitas": RiwayatAktivitas,
};

const pathByPage = {
  dashboard: "/dashboard",
  "input-data": "/input-data",
  "manajemen-data": "/manajemen-data",
  "analisis-ranking": "/analisis-ranking",
  "keputusan-distribusi": "/keputusan-distribusi",
  "status-distribusi": "/status-distribusi",
  laporan: "/laporan",
  "riwayat-aktivitas": "/riwayat-aktivitas",
};

const pageByPath = Object.fromEntries(
  Object.entries(pathByPage).map(([page, path]) => [path, page])
);
```
**Pattern to copy:** add `import ManajemenKota from "./pages/ManajemenKota";` near the other page imports, then add `"manajemen-kota": ManajemenKota,` to `pageRegistry` AND `"manajemen-kota": "/manajemen-kota",` to `pathByPage` IN THE SAME TASK/COMMIT as the `navigation.js` edit above. `pageByPath` is auto-derived from `pathByPage`, no separate edit needed.

**Critical risk (Pitfall 4, App.jsx:151):** `const ActivePage = pageRegistry[activePage] ?? Dashboard;` — if `menuByRole.Admin` gains `"manajemen-kota"` before `pageRegistry` does, clicking the menu item silently renders Dashboard instead of erroring. Do not split these edits across separate tasks.

---

### `src/components/Layout.jsx` (component, transform) — MODIFY

**Analog (same file):** `IkonMenu` switch, `case "database"` (`Layout.jsx:127-...`) and `case "report"` (`Layout.jsx:179-...`)

**Current code shape** (`Layout.jsx:114-178`, switch on `type` prop):
```jsx
function IkonMenu({ type, color }) {
  switch (type) {
    case "input":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
          <ellipse cx="12" cy="6" rx="7" ry="3" stroke={color} strokeWidth="1.5" />
          <path d="M5 6V17C5 18.6569 8.13401 20 12 20C15.866 20 19 18.6569 19 17V6" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    // ... "report" etc.
  }
}
```
**Pattern to copy:** add a new `case "city":` following the exact same shape (`<svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>`, two-stroke paths, `strokeWidth="1.5"`, no fill). Do NOT reuse `"database"`'s icon — RESEARCH.md flags this as visually ambiguous with "Manajemen Data". Suggested glyph (simple building/pin, non-blocking per Open Question #2 in RESEARCH.md):
```jsx
case "city":
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
      <path d="M5 20V9L12 4L19 9V20H5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 20V14H14V20" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
```

## Shared Patterns

### Snapshot-subscribe (cross-cutting, applies to `ManajemenKota.jsx`)
**Source:** `src/pages/ManajemenData.jsx:60,71-77` (and identically in every other page component)
```jsx
const [snapshot, setSnapshot] = useState(store.getState());
useEffect(() => {
  const unsubscribe = store.subscribe(setSnapshot);
  return unsubscribe;
}, []);
```
**Apply to:** `ManajemenKota.jsx` — read both `daftarKota` and `stokTbs` from `snapshot`, never from a direct `store.getX()` getter call inside the render path (Pitfall 5).

### Inline form validation + thrown-error surfacing (cross-cutting, applies to `ManajemenKota.jsx`'s add/edit form)
**Source:** `src/pages/InputData.jsx:51-81` (validate shape) + `src/store.js:248-250` (the one precedent for a thrown business-rule `Error`)
**Apply to:** Both the city add/edit form (D-05/D-06) and any other validation messaging in this phase — required-field/positive-number checks live in the page's `validate(form)`; uniqueness/business-rule checks live in the store and are surfaced via `catch (error) { setFormErrors({ nama: error.message }) }`, never as a toast for this specific error class.

### Single-`notify()`-at-end mutator convention (cross-cutting, applies to all `store.js` edits)
**Source:** `src/store.js` — confirmed via grep across `tambahKota` (253-254), `updateKota` (262-263), `hapusKota` (269-270), `setStokTbs` (281-282), `addKeputusan` (401-402), `removeKeputusan` (451-452)
**Apply to:** The extended `updateKota`/`hapusKota` and new `getKotaReferenceCounts` — all state mutations for a single logical operation (including the D-02 cascade across three collections) happen before exactly one `recordActivity(...)` + `notify()` pair; `getKotaReferenceCounts` is a pure read and must call neither.

### Modal component reuse (cross-cutting, applies to 4 modals in `ManajemenKota.jsx`)
**Source:** `src/components/Modal.jsx`, usage shape at `src/pages/ManajemenData.jsx:415-420,517-521`
```jsx
<Modal judul="..." onTutup={() => setX(null)} konten={<div>...</div>} />
```
**Apply to:** add/edit form modal, delete-confirm modal, NEW delete-blocked notice modal, NEW stock-edit modal — all four use the identical `Modal` wrapper API, only `konten` differs.

### PageHeader / SectionHeader / Card / Tabel / EmptyState / Tombol / useRipple (cross-cutting, applies to whole page)
**Source:** `src/pages/ManajemenData.jsx:336-413` (full render-tree shape)
**Apply to:** `ManajemenKota.jsx`'s overall page structure — `PageHeader` for title/description/actions slot, `Card` + `SectionHeader` wrapping the `Tabel`/`EmptyState`, `Tombol` for all buttons, `useRipple`/`RippleSpans` for the row action buttons (via the copied `AksiTabelButtons`).

## No Analog Found

None — every file in this phase's scope has a strong same-codebase analog (either an existing page to copy structurally, or the same file being extended in place). The only genuinely new logic with no direct precedent is the D-01/D-02 referential-integrity cascade itself, which RESEARCH.md's Architecture Patterns 2-3 already provide as fully-composed, ready-to-paste code (not abstract guidance) — treat those snippets as the analog for that specific sub-problem.

## Metadata

**Analog search scope:** `src/pages/`, `src/store.js`, `src/utils/navigation.js`, `src/App.jsx`, `src/components/Layout.jsx`, `src/components/MetricCard.jsx`
**Files scanned:** `ManajemenData.jsx` (full, 567 lines), `InputData.jsx` (lines 1-130), `store.js` (lines 1-60, 235-289, plus grep across full file for `notify()`/`recordActivity` conventions), `App.jsx` (lines 1-42, plus grep for registry/route logic), `navigation.js` (full, 37 lines), `MetricCard.jsx` (full, 261 lines), `Layout.jsx` (icon switch, lines 109-185)
**Pattern extraction date:** 2026-06-21
