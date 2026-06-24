# Phase 1: Admin City & Stock Management - Research

**Researched:** 2026-06-21
**Domain:** Brownfield CRUD page addition to a hand-rolled client-only React SPA (singleton pub/sub store + manual pushState router), plus referential-integrity logic (cascade-rename / block-delete) for a string-keyed entity
**Confidence:** HIGH

## Summary

This phase adds zero new architectural surface. The store mutators this page needs (`tambahKota`, `updateKota`, `hapusKota`, `getKapasitasKota`, `setStokTbs`, `getStokTbs`) already exist in `src/store.js:247-284` and already follow the project's conventions (Indonesian verb prefixes, `recordActivity` + `notify()` called once at the end, duplicate-name validation via `throw new Error(...)`). What's missing is purely (1) a UI page that calls them, (2) two pieces of referential-integrity logic the existing mutators do NOT have — block-delete-if-referenced (D-01) and cascade-rename-of-references (D-02) — and (3) three additive registrations (`pageRegistry`/`pathByPage` in `App.jsx`, `menuByRole.Admin` in `navigation.js`).

The critical fact for planning precision: cities are referenced by **name as a string** in two other collections, not by foreign key — `state.permintaan[].kota` and `state.keputusan[].kota_tujuan` / `state.riwayatKeputusan[].kota_tujuan`. Both must be checked (for D-01 block) and both must be rewritten (for D-02 cascade) in the same mutation. `riwayatKeputusan` is a superset/audit-trail of `keputusan` (every entry in `keputusan` also exists in `riwayatKeputusan`, plus cancelled ones — see `removeKeputusan`/`restoreKeputusan` in `store.js:443-464`), so the rename cascade must touch all three lists; the delete-block check must inspect at minimum `permintaan` and `keputusan` (the UI-SPEC's blocked-notice copy literally counts "{N} permintaan dan {M} keputusan distribusi").

The recommendation engine (`computeRekomendasiDistribusi` in `utils/distribusi.js:105`) and `KeputusanDistribusi.jsx`/`Dashboard.jsx` all read `daftarKota`/`stokTbs` through the subscribed store snapshot, not through a direct `store.getStokTbs()` call inside the calculation — meaning the new Admin page's mutations propagate automatically with zero additional wiring, as long as the new mutators end with the existing `notify()` call.

**Primary recommendation:** Build `src/pages/ManajemenKota.jsx` as a structural copy of `ManajemenData.jsx`'s CRUD shape (snapshot-subscribe + `Tabel` + `Modal` add/edit + `Modal` delete-confirm), add a `MetricCard size="lg"` (or plain `Card`) stock-summary block per D-04, extend exactly two store mutators (`updateKota` for cascade-rename, `hapusKota` for reference-check-then-block — implemented as a guard plus a new read-only helper, see Architecture Patterns below) in `store.js`, and register the page additively in `App.jsx` + `navigation.js`. No new dependencies, no new state-management pattern, no schema validation library.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Penghapusan & Rename Kota**
- **D-01:** Hapus kota **diblokir total** jika masih ada `permintaan` atau `keputusan`/`riwayatKeputusan` yang mereferensikan kota itu (by nama). Admin harus bersihkan/pindahkan data terkait dulu sebelum kota bisa dihapus. Tidak ada mode "izinkan dengan peringatan" atau "cascade-delete".
- **D-02:** Edit nama kota (rename) **otomatis memperbarui semua referensi lama** — setiap entry di `state.permintaan` (field `kota`) dan `state.keputusan`/`state.riwayatKeputusan` (field `kota_tujuan`) yang match nama lama ikut diganti ke nama baru dalam mutasi yang sama. Data tetap nyambung, konsisten dengan cara pencocokan kota (by name).

**Penempatan & Navigasi**
- **D-03:** Halaman baru berdiri sendiri (working name: "Manajemen Kota"), bukan tab/bagian di dalam halaman "Manajemen Data" yang sudah ada. Perlu entry menu baru untuk role Admin di `src/utils/navigation.js`, plus registrasi di `pageRegistry`/`pathByPage` (`src/App.jsx`).

**UX Edit Stok TBS**
- **D-04:** Stok TBS (`state.stokTbs`, satu angka global, berbeda dari `kapasitas` per kota) ditampilkan & diedit lewat **card ringkasan tersendiri** dengan tombol edit — bukan inline quick-edit, bukan baris tabel. Diposisikan di halaman yang sama dengan daftar kota (di atas atau berdampingan dengan tabel).

**Validasi Form**
- **D-05:** Error nama duplikat (dilempar oleh `tambahKota` sebagai `Error`) ditampilkan sebagai **inline error per field** di bawah field nama — konsisten dengan pola `validate(form) -> {field: message}` di `InputData.jsx`/`ManajemenData.jsx`. Bukan toast.
- **D-06:** Validasi form kota: nama wajib & unik (cek duplikat), kapasitas harus angka positif. **Tidak ada validasi tambahan** di luar dua itu — user mengonfirmasi cukup.

### Claude's Discretion
- Detail visual minor yang tidak dibahas: ikon menu, urutan kolom tabel, copy/teks tombol persis — boleh diputuskan saat planning/eksekusi mengikuti konvensi yang sudah ada di `ManajemenData.jsx`.

### Deferred Ideas (OUT OF SCOPE)
None — tidak ada scope creep yang muncul selama diskusi. Semua pertanyaan tetap dalam batas Phase 1 (ADMIN-01..06).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin can view a list of all cities with their TBS capacity | `Tabel` component + `daftarKota` snapshot read, same pattern as `ManajemenData.jsx:79` / `InputData.jsx:49`. See Architecture Patterns Pattern 1, Code Examples. |
| ADMIN-02 | Admin can add a new city with a name and capacity, via a form with inline validation | `store.tambahKota({nama, kapasitas})` (`store.js:247-256`) already validates duplicate name via thrown `Error`; UI must add `validate(form)` pre-check for required-name + positive-capacity (D-06) before calling it, matching `InputData.jsx:51-81`. See Code Examples "Add City". |
| ADMIN-03 | Admin can edit an existing city's name and capacity | `store.updateKota(namaLama, {nama, kapasitas})` (`store.js:258-265`) must be extended for cascade-rename (D-02) — see Don't Hand-Roll / Architecture Patterns Pattern 2. |
| ADMIN-04 | Admin can delete a city, with explicit block/warn/cascade behavior for referenced cities | New reference-check logic required before `hapusKota` is called — D-01 locks "block totally". See Architecture Patterns Pattern 3, Runtime State Inventory. |
| ADMIN-05 | Admin can view and update the current TBS stock value | `store.getStokTbs()`/`setStokTbs(value)` (`store.js:274-284`) already complete; UI needs the D-04 card-with-modal pattern only. See Code Examples "Stock Editor". |
| ADMIN-06 | Adding a duplicate city name shows an inline error instead of failing silently or crashing | `tambahKota` already throws `"Kota dengan nama tersebut sudah ada."` (`store.js:249`) — UI must catch this in the submit handler and surface as `formErrors.nama`, NOT a toast (D-05). See Common Pitfalls Pitfall 1. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| City list rendering (ADMIN-01) | Page Layer (`ManajemenKota.jsx`) | Shared Component Layer (`Tabel`) | Page owns snapshot subscription + derived view; `Tabel` is a pure presentational component fed `daftarKota` |
| City add/edit/delete validation (ADMIN-02/03/04/06) | Page Layer (form-level `validate()`) | Store Layer (`tambahKota` duplicate-check, thrown `Error`) | Per CONVENTIONS.md: business-rule validation (uniqueness) lives in the store; the page's job is only required-field/format pre-checks (D-06) and catching/displaying the store's thrown error (D-05) |
| Cascade-rename / block-delete referential integrity (ADMIN-03/04, D-01/D-02) | Store Layer (`store.js` mutators) | — | This is data-integrity logic that touches three collections (`permintaan`, `keputusan`, `riwayatKeputusan`) atomically in one mutation — must live in the store, never duplicated/reimplemented in the page (Anti-Pattern: page-level shadow validation) |
| TBS stock read/write propagation to recommendation engine (ADMIN-05) | Store Layer (`setStokTbs`/`getStokTbs`, unchanged) | Utility Layer (`distribusi.js` reads via snapshot prop, not direct getter call) | Already-correct existing wiring — the new stock editor must call `store.setStokTbs(value)` exactly as-is; propagation to `computeRekomendasiDistribusi` happens automatically via the snapshot-subscribe pattern, zero new code needed |
| Page registration / menu visibility (D-03) | Router/Shell Layer (`App.jsx` lookup tables) | Role-based Menu Config (`navigation.js`) | Purely additive entries in existing plain-object lookup tables; does not touch the four fragile `useEffect`s in `App.jsx:90-134` |
| Stock summary card display (D-04) | Shared Component Layer (`MetricCard` or `Card`) | Page Layer (modal state for edit) | `MetricCard` already supports a `size="lg"` variant matching the "card ringkasan" requirement; the edit interaction (open `Modal`, single field, Simpan/Batal) is page-local state, not a new shared component |

## Standard Stack

### Core
No new dependencies. This phase exclusively reuses what's already in `package.json`.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| react | ^18.3.1 (verified in `package.json:13`) | UI framework | Already the entire app's runtime |
| react-dom | ^18.3.1 | DOM rendering | Already in use |
| vite | ^7.0.0 (devDependency) | Dev server / build | Already in use, no test runner attached |

### Supporting
None needed — every supporting piece (form state, validation, modal, table, toast) is hand-rolled and already exists in `src/components/*` and `src/hooks/useRipple.jsx`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `validate(form) -> {field: message}` | react-hook-form + Zod | Explicitly rejected by project-level research (`research/SUMMARY.md`) and PROJECT.md constraints — would introduce a second validation idiom for a 2-field form; the existing pattern is already proven twice in this codebase (`InputData.jsx`, `ManajemenData.jsx`) |
| `Modal` reuse for stock editor | A dedicated `/manajemen-kota/stok` sub-route | Rejected by D-03/D-04 explicitly — single page, two zones, modal-based edit, no new route |

**Installation:** None — no `npm install` needed for this phase.

**Version verification:** `react ^18.3.1`, `react-dom ^18.3.1`, `vite ^7.0.0` confirmed directly from `package.json:10-20` (read directly from repo, not registry-queried, since no new packages are introduced — `[VERIFIED: package.json]`).

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages — it is a pure UI + store-mutator extension using only dependencies already present in `package.json` (`react`, `react-dom`). No `npm install` commands belong in any plan task for this phase. If a planner or executor finds themselves wanting to add a package (e.g. a validation library, a confirm-dialog library), that is a signal of scope drift — re-read CONTEXT.md D-05/D-06 and `research/PITFALLS.md` Pitfall 4 before proceeding.

**Packages removed due to [SLOP] verdict:** none (no packages evaluated — none proposed).
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Admin opens "Manajemen Kota" (new menu item, Admin-only)            │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
        ┌─────────────────────────────────────────────────┐
        │  ManajemenKota.jsx (NEW page)                     │
        │  - useState(store.getState()) + store.subscribe() │
        │  - derives daftarKota, stokTbs from snapshot       │
        └───────┬───────────────────┬───────────────────────┘
                │                   │
   [Add/Edit City form]     [Edit Stock TBS modal]
                │                   │
                ▼                   ▼
   validate(form) -> {field:msg}   validate(value) -> {field:msg}
   (D-06: nama required+unique,   (positive number)
    kapasitas positive number)
                │                   │
        if valid, call:        if valid, call:
                │                   │
                ▼                   ▼
  ┌──────────────────────────┐  ┌─────────────────────┐
  │ store.tambahKota(...)     │  │ store.setStokTbs(v) │
  │ store.updateKota(old,new) │  └──────────┬───────────┘
  │   └─ cascade-rename (D-02)│             │
  │ store.hapusKota(nama)     │             │
  │   └─ reference-check first│             │
  │      (D-01, NEW guard)    │             │
  └──────────────┬─────────────┘             │
                 │                            │
                 ▼                            ▼
        ┌─────────────────────────────────────────┐
        │ store.js: mutate state, recordActivity(), │
        │           notify() ONCE at end            │
        └──────────────────┬──────────────────────────┘
                            ▼
        ┌─────────────────────────────────────────┐
        │ persistState() -> localStorage            │
        │ listeners.forEach(listener => listener()) │
        └──────────────────┬──────────────────────────┘
                            ▼
   ┌────────────────────────┴─────────────────────────────────┐
   ▼                        ▼                                 ▼
ManajemenKota.jsx      InputData.jsx (dropdown +      KeputusanDistribusi.jsx /
re-renders table/card  empty-state, VALID-03)         Dashboard.jsx — recommendation
                                                       engine re-runs via
                                                       computeRekomendasiDistribusi(
                                                         permintaan, daftarKota, stokTbs)
                                                       — all read from subscribed
                                                       snapshot, zero extra wiring
```

### Recommended Project Structure
```
src/
├── pages/
│   └── ManajemenKota.jsx       # NEW — single file, copies ManajemenData.jsx shape
├── components/
│   └── (unchanged — reuse Card, Modal, Tabel, PageHeader, SectionHeader,
│        Tombol, EmptyState, MetricCard, Toast, useRipple as-is)
├── store.js                    # MODIFY — extend updateKota (cascade-rename) and
│                                  hapusKota (reference-check-block); add one new
│                                  read-only helper (e.g. getKotaReferenceCounts)
├── utils/navigation.js         # MODIFY — add one entry to menuByRole.Admin
└── App.jsx                     # MODIFY — add one entry each to pageRegistry,
                                   pathByPage (additive only)
```

### Pattern 1: Store-First CRUD Page (copy `ManajemenData.jsx`'s shape exactly)

**What:** Subscribe to store snapshot; derive `daftarKota`/`stokTbs` via `useMemo`; render `Tabel` with an `aksi` render-prop for Edit/Hapus buttons (reuse `AksiTabelButtons`-style component, see `ManajemenData.jsx:23-57`); manage local state for two modals (add/edit form, delete confirmation) plus a third for the stock editor; validate inline before calling store mutators; catch thrown errors from `tambahKota`/`hapusKota` and surface as field-level errors.

**When to use:** This entire phase — it is the only pattern needed.

**Example (skeleton, adapted from `research/ARCHITECTURE.md`'s already-validated sketch, cross-checked against the actual `tambahKota`/`updateKota` signatures in `store.js:247-265`):**
```jsx
// Source: src/pages/ManajemenData.jsx (existing precedent, read directly), adapted
import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import Tabel from "../components/Tabel";
import Tombol from "../components/Tombol";
import MetricCard from "../components/MetricCard";
import { showToast } from "../components/Toast";
import useRipple, { RippleSpans } from "../hooks/useRipple";
import store from "../store";

const initialForm = { nama: "", kapasitas: "" };

function ManajemenKota({ onNavigate }) {
  const [snapshot, setSnapshot] = useState(store.getState());
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [editTarget, setEditTarget] = useState(null); // null = add mode; city object = edit mode
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [blockedTarget, setBlockedTarget] = useState(null); // D-01 blocked-delete notice
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockValue, setStockValue] = useState("");
  const [stockError, setStockError] = useState("");

  useEffect(() => {
    const unsubscribe = store.subscribe(setSnapshot);
    return unsubscribe;
  }, []);

  const daftarKota = useMemo(() => snapshot.daftarKota ?? [], [snapshot.daftarKota]);
  const stokTbs = snapshot.stokTbs ?? 0;

  // D-06: required name (unless unchanged in edit mode), positive numeric capacity.
  // Duplicate-name check is delegated to store.tambahKota's thrown Error — do not
  // re-implement it here (see Common Pitfalls Pitfall 1).
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

  const submitForm = () => {
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      if (editTarget) {
        store.updateKota(editTarget.nama, { nama: form.nama.trim(), kapasitas: form.kapasitas });
        showToast({ type: "success", message: "Kota berhasil diperbarui." });
      } else {
        store.tambahKota({ nama: form.nama.trim(), kapasitas: form.kapasitas });
        showToast({ type: "success", message: "Kota berhasil ditambahkan." });
      }
      setIsFormOpen(false);
      setForm(initialForm);
      setFormErrors({});
      setEditTarget(null);
    } catch (error) {
      // tambahKota throws "Kota dengan nama tersebut sudah ada." (store.js:249) —
      // surface under the nama field per D-05, never as a toast.
      setFormErrors({ nama: error.message });
    }
  };

  // ... render PageHeader, stock MetricCard, Tabel/EmptyState, 4 modals
  // (add/edit form, delete confirm, delete-blocked notice, stock edit)
}

export default ManajemenKota;
```

### Pattern 2: Store-Layer Cascade-Rename (D-02 implementation point)

**What:** `updateKota` must be extended so that renaming a city (`namaLama !== nama`) also rewrites every matching reference in `state.permintaan[].kota` and `state.keputusan[]`/`state.riwayatKeputusan[].kota_tujuan`, in the **same** mutator call, before the single `notify()` at the end.

**When to use:** Exactly once, inside `store.updateKota` in `src/store.js`. Do not duplicate this logic in the page.

**Exact mutation site (current code, `store.js:258-265`):**
```js
// Source: src/store.js:258-265 (current, BEFORE this phase's change)
updateKota(namaLama, { nama, kapasitas }) {
  state.daftarKota = state.daftarKota.map((kota) =>
    kota.nama === namaLama ? { nama, kapasitas: Number(kapasitas) || 0 } : kota
  );
  recordActivity(`Memperbarui data kota ${namaLama}`);
  notify();
  return clone(state.daftarKota);
},
```

**Recommended extension (cascade added, still one `notify()` call at the end — matches the existing convention that mutators only call `notify()` once, observed in every other mutator in `store.js`):**
```js
// Source: planning-time extension of src/store.js:258-265, following the
// existing single-notify-at-end convention used by every other mutator in this file
updateKota(namaLama, { nama, kapasitas }) {
  const namaBaru = nama.trim();

  state.daftarKota = state.daftarKota.map((kota) =>
    kota.nama === namaLama ? { nama: namaBaru, kapasitas: Number(kapasitas) || 0 } : kota
  );

  if (namaBaru !== namaLama) {
    state.permintaan = state.permintaan.map((item) =>
      item.kota === namaLama ? { ...item, kota: namaBaru } : item
    );
    state.keputusan = state.keputusan.map((item) =>
      item.kota_tujuan === namaLama ? { ...item, kota_tujuan: namaBaru } : item
    );
    state.riwayatKeputusan = state.riwayatKeputusan.map((item) =>
      item.kota_tujuan === namaLama ? { ...item, kota_tujuan: namaBaru } : item
    );
  }

  recordActivity(`Memperbarui data kota ${namaLama}`);
  notify();
  return clone(state.daftarKota);
},
```

**Why all three collections:** `riwayatKeputusan` is not derived from `keputusan` — they diverge once `removeKeputusan` (cancels) or `restoreKeputusan` runs (`store.js:443-464`), so a cancelled decision could exist in `riwayatKeputusan` with a stale `kota_tujuan` if only `keputusan` were updated. The UI-SPEC's copywriting contract explicitly names this as "invisible plumbing" (no separate confirmation UI, no "N records updated" message) — the cascade must be silent and complete in one pass.

**Trade-offs:**
- Pro: Single mutation, single `notify()`, matches existing convention exactly — no new architectural pattern.
- Pro: `normalizePermintaanEntry`/`normalizePermintaanList` (`store.js:47-52`) are NOT invoked here since this only mutates the `kota` field by direct map, not via `updateCollection` — verify this doesn't skip any other normalization the `permintaan` collection expects (currently it only normalizes `tanggal_permintaan`/`tanggal_input` fallback, unrelated to `kota`, so direct `state.permintaan = ...map(...)` is safe without going through `updateCollection`).
- Con/risk: If a future field is added to `permintaan`/`keputusan` that *also* embeds the city name (e.g., a denormalized display label), this cascade will not catch it — re-grep for `kota`/`kota_tujuan` usage if this mutator is touched again later.

### Pattern 3: Store-Layer Block-Delete-If-Referenced (D-01 implementation point)

**What:** Before `hapusKota` removes a city, check whether any entry in `state.permintaan` (`kota` field) or `state.keputusan`/`state.riwayatKeputusan` (`kota_tujuan` field) still references it by name. If yes, the mutator must NOT delete and must signal the blocking condition back to the caller (the page) so it can render the D-01 "Tidak Bisa Menghapus Kota" modal with the **exact counts** the UI-SPEC's copy requires ("...masih digunakan oleh {N} permintaan dan {M} keputusan distribusi").

**When to use:** Exactly once, inside `store.hapusKota` plus one new read-only helper.

**Recommended approach — add a dedicated query method, then guard `hapusKota`:**
```js
// Source: planning-time addition to src/store.js, placed near getKapasitasKota (store.js:243-245)
getKotaReferenceCounts(nama) {
  const permintaanCount = state.permintaan.filter((item) => item.kota === nama).length;
  const keputusanCount = state.keputusan.filter((item) => item.kota_tujuan === nama).length;
  return { permintaanCount, keputusanCount };
},

hapusKota(nama) {
  const { permintaanCount, keputusanCount } = store.getKotaReferenceCounts(nama);

  if (permintaanCount > 0 || keputusanCount > 0) {
    throw new Error(
      `Kota ${nama} tidak bisa dihapus karena masih digunakan oleh ${permintaanCount} permintaan dan ${keputusanCount} keputusan distribusi.`
    );
  }

  state.daftarKota = state.daftarKota.filter((kota) => kota.nama !== nama);
  recordActivity(`Menghapus kota ${nama} dari daftar kota`);
  notify();
  return clone(state.daftarKota);
},
```

**Why throw rather than return a boolean/null:** Matches the codebase's one existing precedent for store-level validation failure (`tambahKota`'s thrown `Error` for duplicate name, `store.js:249`) — `hapusKota` becomes the second mutator with throw-based validation, and the UI's existing `try/catch` pattern (already required for `tambahKota`) extends naturally to wrap the delete-confirm handler too. This also means the exact `{N}`/`{M}` counts the UI-SPEC's blocked-notice copy requires are available directly from `error.message` if the message is parsed, OR (preferred — avoid string-parsing) the page should call `store.getKotaReferenceCounts(nama)` directly when opening the delete-confirm step, decide block vs. confirm from that, and only call `store.hapusKota` when the counts are both zero — making the thrown Error a defense-in-depth backstop, not the primary UI signal path.

**Recommended UI flow (avoids parsing error messages for counts):**
```jsx
// Source: planning-time page-layer logic, ManajemenKota.jsx
const requestDelete = (kota) => {
  const { permintaanCount, keputusanCount } = store.getKotaReferenceCounts(kota.nama);
  if (permintaanCount > 0 || keputusanCount > 0) {
    setBlockedTarget({ ...kota, permintaanCount, keputusanCount });
  } else {
    setDeleteTarget(kota);
  }
};

const confirmDelete = () => {
  if (!deleteTarget) return;
  store.hapusKota(deleteTarget.nama); // safe: requestDelete already verified zero references
  setDeleteTarget(null);
  showToast({ type: "success", message: "Kota berhasil dihapus." });
};
```

**Trade-offs:**
- Pro: `getKotaReferenceCounts` is a pure read, reusable for both the UI decision (block vs. confirm modal) and the throw-based backstop — no duplicated counting logic.
- Pro: Matches D-01's exact requirement: "diblokir total... Tidak ada mode izinkan dengan peringatan atau cascade-delete" — there is no code path that deletes a referenced city, by construction.
- Con/risk: `keputusan` (active decisions) vs. `riwayatKeputusan` (full history including cancelled) — D-01's UI-SPEC copy says "keputusan distribusi" without specifying which collection. **Recommendation (flagged as ASSUMED, needs no further research — purely a phase-planning call):** count against `state.keputusan` (active decisions only) for the block check, matching `getKotaReferenceCounts`'s `keputusanCount` above, since blocking on *cancelled* historical decisions in `riwayatKeputusan` would make it nearly impossible to ever delete a city that was ever decided-and-cancelled. This interpretation should be confirmed with one line in the phase plan rather than re-litigated in code.

### Pattern 4: Additive Route Registration (D-03 implementation point)

**What:** Exactly three additive edits, none touching the four fragile `useEffect`s in `App.jsx:90-134`.

**Example:**
```jsx
// Source: src/App.jsx — additive only
import ManajemenKota from "./pages/ManajemenKota";

const pageRegistry = {
  dashboard: Dashboard,
  "input-data": InputData,
  "manajemen-data": ManajemenData,
  "manajemen-kota": ManajemenKota,   // NEW — add to BOTH lookup tables together
  "analisis-ranking": AnalisisRanking,
  // ...unchanged
};

const pathByPage = {
  dashboard: "/dashboard",
  "manajemen-data": "/manajemen-data",
  "manajemen-kota": "/manajemen-kota",   // NEW
  // ...unchanged
};
```
```js
// Source: src/utils/navigation.js:7-13 — additive only
export const menuByRole = {
  Admin: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "input-data", label: "Input Data", icon: "input" },
    { key: "manajemen-data", label: "Manajemen Data", icon: "database" },
    { key: "manajemen-kota", label: "Manajemen Kota", icon: "city" },   // NEW
    { key: "riwayat-aktivitas", label: "Riwayat Aktivitas", icon: "report" },
  ],
  // "Manajer Distribusi" / "Tim Logistik" unchanged — Admin-only page
};
```

**Critical ordering rule (from `research/ARCHITECTURE.md`, re-verified against `App.jsx:151`):** Add to `pageRegistry` AND `pathByPage` in the same commit/task as adding to `menuByRole.Admin`. If `menuByRole.Admin` gains the key first without `pageRegistry` having it, `App.jsx:151`'s fallback (`pageRegistry[activePage] ?? Dashboard`) silently renders `Dashboard` instead of erroring — a silent-wrong-page bug, not a crash, and easy to miss in manual testing since the app still "works."

### New Icon Case (UI-SPEC requirement, `Layout.jsx:114-204`)

The `IkonMenu` switch has cases for `input`, `database`, `chart`, `decision`, `truck`, `report`, `dashboard` (default) — no `city` case exists yet. Per UI-SPEC: add a new case, `strokeWidth="1.5"`, do not reuse `"database"` (already used by "Manajemen Data", would be visually ambiguous).

```jsx
// Source: src/components/Layout.jsx:114-204 — additive new case, same iconStyle/viewBox
// convention as every other case (simple two-stroke building/pin glyph per UI-SPEC)
case "city":
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
      <path d="M5 20V9L12 4L19 9V20H5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 20V14H14V20" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
```

### Anti-Patterns to Avoid

- **Re-implementing duplicate-name checking in the page:** `tambahKota` already throws on duplicate name (`store.js:249`). The page's `validateForm` should only check required-field/positive-number (D-06); duplicate detection must come from catching the store's thrown `Error`, never a page-local `daftarKota.some(...)` pre-check that risks drifting out of sync with the store's actual matching logic (case-sensitivity, trimming).
- **Calling `getNextId` for cities:** Cities are keyed by `nama` (string), not a generated ID. Never call `getNextId(state.daftarKota, "KOTA")` or invent an `id` field for `daftarKota` entries — `kotaSeed` (`store.js:30-39`) has no `id` field, and `getKapasitasKota`/`tambahKota`/`updateKota`/`hapusKota` all match by `nama` exclusively.
- **Double-logging activity:** `tambahKota`/`updateKota`/`hapusKota`/`setStokTbs` already call `recordActivity(...)` internally. Do not call `store.catatAktivitas(...)` again from the page after these mutators return.
- **Bypassing the store for the cascade/block logic:** Do not implement D-01/D-02 by having the page read `permintaan`/`keputusan` directly and call `updatePermintaan`/`updateKeputusan` in a loop from the page layer. This logic is data-integrity logic that belongs in the store (single source of truth for the mutation), matching `research/ARCHITECTURE.md`'s Anti-Pattern 1 guidance generalized to this specific case.
- **New state-management mechanism:** No Context/Reducer/separate store slice for cities — `daftarKota`/`stokTbs` are already top-level keys on the existing singleton `state` object.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Duplicate-name detection | A new `isDuplicateName(daftarKota, nama)` page-local helper | Catch the `Error` already thrown by `store.tambahKota` (`store.js:249`) | The store is the single source of truth for this check; a page-local re-implementation risks diverging (e.g. different case-sensitivity) from the store's actual matching |
| Referenced-by-others detection | A new client-side join/filter scattered across the page render | The new `store.getKotaReferenceCounts(nama)` helper (Pattern 3) | Centralizes the "what collections reference a city by name" knowledge in one place — if a future collection also references cities by name, only this helper needs updating |
| Form-level validation framework | react-hook-form / Yup / Zod | The existing `validate(form) -> {field: message}` closure pattern from `InputData.jsx:51-81` | Explicitly rejected by project-level research; a 2-field form (nama, kapasitas) does not need a validation library, and introducing one here breaks the project's "zero new dependencies" constraint for no benefit |
| Modal/dialog accessibility (focus trap, Escape-to-close) | A new modal implementation | The existing `Modal` component (`src/components/Modal.jsx`) — already handles focus trap, Tab cycling, Escape key, and `aria-modal` | Already correctly implemented; building a second modal component for this one page would violate the "swap implementation, not pattern" principle from `research/PITFALLS.md` |
| Stock summary number animation/formatting | A new number-formatting/count-up utility | `MetricCard` (`src/components/MetricCard.jsx`) already has `useCountUp` + `Intl.NumberFormat("id-ID")` baked in via the `nilai` prop | `MetricCard size="lg"` is explicitly named in the UI-SPEC as matching D-04's "card ringkasan" requirement |

**Key insight:** Every "hand-roll-able" problem in this phase already has a same-codebase precedent that's correct and idiomatic — the actual engineering risk is not "what library do I need" but "did I re-read the exact store mutator signatures before building UI around them" (per `research/PITFALLS.md` Pitfall 3).

## Common Pitfalls

### Pitfall 1: Catching `tambahKota`'s thrown error incorrectly (swallowing instead of surfacing)
**What goes wrong:** A `try/catch` around `store.tambahKota(...)` that logs to console or shows a generic toast instead of routing `error.message` into `formErrors.nama`.
**Why it happens:** Most other store mutators never throw (they silently no-op or always succeed), so a developer pattern-matching on the majority case writes a catch block that doesn't expect a meaningful `.message`.
**How to avoid:** Explicitly write `setFormErrors({ nama: error.message })` inside the catch block, matching D-05's locked decision (inline error under Nama Kota field, never a toast for this specific error).
**Warning signs:** A toast appears for the duplicate-name case instead of inline text under the field; `console.error` calls appear in the new page's catch blocks.

### Pitfall 2: Cascade-rename or block-delete touching only `keputusan`, missing `riwayatKeputusan`
**What goes wrong:** `keputusan` and `riwayatKeputusan` look like duplicates of each other in seed data, leading to an assumption that updating one keeps both in sync. They diverge after `removeKeputusan`/`restoreKeputusan` run (cancelled decisions only exist with full history in `riwayatKeputusan`).
**Why it happens:** The store's own `addKeputusan` writes to both lists simultaneously (`store.js:394-395`), making it look like they're always identical — but `removeKeputusan` (`store.js:443-454`) only marks status in `riwayatKeputusan` while removing from `keputusan` entirely, which is the divergence point.
**How to avoid:** Always update all three collections (`permintaan`, `keputusan`, `riwayatKeputusan`) in the cascade-rename mutator, per Pattern 2 above. For the block-delete check, decide explicitly whether `riwayatKeputusan` (full history, including cancelled) also blocks deletion, or only active `keputusan` does (Pattern 3 recommends active-only, but this should be a one-line decision recorded in the phase plan, not left implicit).
**Warning signs:** Renaming a city, then checking `RiwayatAktivitas.jsx`/history views, shows the old name still present for cancelled decisions.

### Pitfall 3: Building the new CRUD page without re-reading `store.js`'s exact mutator signatures (PITFALLS.md Pitfall 3, already flagged at project level — re-stated here because it is THE central pitfall for this specific phase)
**What goes wrong:** Pattern-matching only on `ManajemenData.jsx` (which manages `permintaan`, an ID-keyed collection using `getNextId`) without re-reading the actual `tambahKota`/`updateKota`/`hapusKota` signatures in `store.js:247-272`, leading to an ID scheme invented for cities (wrong — `nama` is the key) or a try/catch that doesn't expect a thrown error (wrong — `tambahKota` is the one mutator in this file that throws).
**Why it happens:** `ManajemenData.jsx` is the closest visual precedent but governs a different collection with different key semantics.
**How to avoid:** Treat `store.js:239-284` (the `getDaftarKota`/`getKapasitasKota`/`tambahKota`/`updateKota`/`hapusKota`/`getStokTbs`/`setStokTbs` block) as the actual contract to build against — re-read it fully before writing `ManajemenKota.jsx`, not just `ManajemenData.jsx`.
**Warning signs:** `getNextId(..., "KOTA")` or a `kota.id` field appears anywhere in new code.

### Pitfall 4: Silent wrong-page fallback if registry edits are split across commits
**What goes wrong:** Adding `manajemen-kota` to `menuByRole.Admin` without simultaneously adding it to `pageRegistry`/`pathByPage` causes `App.jsx:151`'s `pageRegistry[activePage] ?? Dashboard` fallback to silently render the Dashboard instead of the new page — no error, no console warning, just the wrong page.
**Why it happens:** The three registries are independent plain objects; nothing enforces they're updated together.
**How to avoid:** Make all three edits (`pageRegistry`, `pathByPage`, `menuByRole.Admin`) part of the same task/commit, then manually click the new menu item as Admin before considering the registration done.
**Warning signs:** Clicking "Manajemen Kota" in the sidebar renders the Dashboard instead.

### Pitfall 5: Stock editor bypassing the snapshot-subscribe propagation path
**What goes wrong:** Calling `store.getStokTbs()` once on mount and caching it in local state instead of reading `snapshot.stokTbs` from the subscribed snapshot on every render, causing the stock summary card to go stale after another tab/component updates it.
**Why it happens:** `getStokTbs()` looks like the "obvious" getter to call, but it returns a snapshot-in-time value, not a live-reactive one.
**How to avoid:** Read `stokTbs` from the already-subscribed `snapshot` object (`const stokTbs = snapshot.stokTbs ?? 0`), exactly as `Dashboard.jsx:1504` and `KeputusanDistribusi.jsx:28` already do — never call `store.getStokTbs()` directly inside a render path that's supposed to be reactive.
**Warning signs:** The stock summary card doesn't update immediately after saving in the edit modal (it would require a manual page refresh to reflect the new value).

## Runtime State Inventory

This phase is additive (new page + extended mutators), not a rename/refactor of an existing concept — but D-01/D-02 are themselves about handling pre-existing runtime references correctly. Documenting explicitly per protocol:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `daftarKota` (array of `{nama, kapasitas}`, no ID), `stokTbs` (single number) — both persisted in `localStorage["switera_state_v1"]` via `persistState()` (`store.js:109-119`). Referenced-by-name from `state.permintaan[].kota` and `state.keputusan[]`/`state.riwayatKeputusan[].kota_tujuan`. | Code edit only (extend `updateKota`/`hapusKota` per Patterns 2/3) — no separate data migration needed since the existing localStorage shape is unchanged, only the mutator *logic* changes |
| Live service config | None — fully client-only app, no external services, no config living outside this repo's `localStorage`. | None |
| OS-registered state | None — browser-only SPA, no OS-level task scheduling, no installed services. | None |
| Secrets/env vars | None — no `.env` files, no secrets referenced anywhere in this phase's scope (confirmed via `STACK.md`: "No environment variables are read anywhere in the source"). | None |
| Build artifacts | None — no compiled binaries or installed packages affected; this phase adds one `.jsx` file and edits three existing `.js`/`.jsx` files, no build config changes. | None |

**Legacy-data note (related fragile area, not this phase's job to fix but relevant context):** `isLegacyDaftarKota` (`store.js:80-81`) silently resets `daftarKota` to seed data if a user's persisted `localStorage` has the old string-array shape. This phase's new mutators do not interact with that migration path — out of scope, but worth knowing it exists if a tester sees city data unexpectedly reset to the 8 seed cities during manual testing.

## Code Examples

### Add City (ADMIN-02, ADMIN-06)
```jsx
// Source: composed from src/pages/InputData.jsx:51-118 (validate+submit shape)
// and src/store.js:247-256 (tambahKota contract)
const openAddModal = () => {
  setEditTarget(null);
  setForm({ nama: "", kapasitas: "" });
  setFormErrors({});
  setIsFormOpen(true);
};

// submitForm shown in full in Architecture Patterns Pattern 1 above
```

### Edit City with Rename (ADMIN-03, D-02 cascade is store-side and transparent to this call)
```jsx
// Source: composed from src/pages/ManajemenData.jsx:144-155 (openEditModal shape)
const openEditModal = (kota) => {
  setEditTarget(kota);
  setForm({ nama: kota.nama, kapasitas: String(kota.kapasitas) });
  setFormErrors({});
  setIsFormOpen(true);
};
// submitForm (Pattern 1) calls store.updateKota(editTarget.nama, {nama, kapasitas})
// — the cascade-rename happens entirely inside the store, no extra page-side step
```

### Delete City with Block Guard (ADMIN-04, D-01)
```jsx
// Source: Pattern 3 above, repeated here for ADMIN-04 traceability
const requestDelete = (kota) => {
  const { permintaanCount, keputusanCount } = store.getKotaReferenceCounts(kota.nama);
  if (permintaanCount > 0 || keputusanCount > 0) {
    setBlockedTarget({ ...kota, permintaanCount, keputusanCount });
  } else {
    setDeleteTarget(kota);
  }
};
```

### Stock Editor (ADMIN-05, D-04)
```jsx
// Source: composed from src/components/MetricCard.jsx (size="lg" variant) +
// src/store.js:274-284 (getStokTbs/setStokTbs contract)
const openStockModal = () => {
  setStockValue(String(snapshot.stokTbs ?? 0));
  setStockError("");
  setIsStockModalOpen(true);
};

const submitStock = () => {
  const numericValue = Number(stockValue);
  if (!stockValue || numericValue <= 0) {
    setStockError("Stok harus berupa angka positif.");
    return;
  }
  store.setStokTbs(numericValue);
  setIsStockModalOpen(false);
  showToast({ type: "success", message: "Stok TBS berhasil diperbarui." });
};

// Render (stock summary, D-04 card-with-edit-button, not inline-editable):
<MetricCard
  label="Stok TBS Tersedia (ton)"
  nilai={`${snapshot.stokTbs ?? 0} ton`}
  size="lg"
  accent="primary"
>
  <Tombol label="Edit" variant="sekunder" onClick={openStockModal} />
</MetricCard>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---------------|-------------------|---------------|--------|
| `daftarKota`/`stokTbs` have store mutators but no UI consumer | New `ManajemenKota.jsx` page is the first UI to call `tambahKota`/`updateKota`/`hapusKota`/`setStokTbs` | This phase | Cities go from fixed seed data to freely Admin-editable for the first time in the app's history — this is the trigger for the CSV-injection question noted below |

**Deprecated/outdated:** Nothing in this phase deprecates existing code — it is purely additive plus two store-mutator extensions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The D-01 block-delete check should count against active `state.keputusan` (not also `state.riwayatKeputusan`'s cancelled-only entries) for the `{M} keputusan distribusi` count in the blocked-notice copy | Architecture Patterns Pattern 3 | If wrong, a city that was once referenced by a now-cancelled decision would remain undeletable forever even though no live record exists — low risk (overly conservative, not data-corrupting), but worth a one-line confirmation in the phase plan rather than silently assumed in code |
| A2 | CSV export (`src/utils/csv.js`) does not need formula-injection escaping (`=`/`+`/`-`/`@` prefix neutralization) as part of THIS phase, even though city names become user-entered for the first time | Common Pitfalls (contextual), State of the Art | Tracked explicitly as `SEC-01` in `.planning/REQUIREMENTS.md`'s v2 section ("deferred unless ADMIN-04 work surfaces it as urgent") — this research did not find it urgent (city names are typed by the trusted Admin role only, in a single-browser demo with no external sharing of exported CSVs), but flagging here per the project's own deferred-item tracking so the planner doesn't need to re-derive this from REQUIREMENTS.md |
| A3 | `riwayatKeputusan`'s divergence from `keputusan` (via `removeKeputusan`/`restoreKeputusan`) is fully captured by reading `store.js:443-464` once — no other mutator creates further divergence | Common Pitfalls Pitfall 2 | If another divergence path exists that wasn't read during this research pass, the cascade-rename (Pattern 2) could miss updating a stale reference in an edge case (e.g., a restored-then-modified decision) — low risk given the small mutator surface (~30 methods, all read directly in this research session) |

## Open Questions

1. **Should the D-01 block-delete check also count `riwayatKeputusan` entries with `status: "dibatalkan"` (cancelled)?**
   - What we know: D-01's UI-SPEC copy says "{N} permintaan dan {M} keputusan distribusi" without specifying active-only vs. full-history.
   - What's unclear: Whether a cancelled decision still counts as a "reference that must be cleaned up first."
   - Recommendation: Default to active-only (`state.keputusan`, Pattern 3 above) since this is the more usable interpretation and matches "keputusan distribusi" reading naturally as "current decisions," not "decision history." Confirm with a one-line note in PLAN.md rather than blocking on it.

2. **Exact icon glyph for the new `"city"` `IkonMenu` case.**
   - What we know: UI-SPEC mandates "a simple two-stroke building/pin glyph, `strokeWidth=\"1.5\"`," explicitly not reusing `"database"`.
   - What's unclear: The precise path data is Claude's Discretion per CONTEXT.md (visual detail not discussed).
   - Recommendation: Use the house/building glyph sketched in Architecture Patterns "New Icon Case" above, or any equivalent two-stroke glyph at execution time — this is non-blocking for planning.

## Environment Availability

No external dependencies for this phase (no new packages, no external services, no databases beyond `localStorage`). Skipping per the skip condition — this is a pure code/config change within an already-running Vite dev environment.

## Validation Architecture

> `workflow.nyquist_validation: true` confirmed in `.planning/config.json`. No test framework exists in this repo (`TESTING.md`: "None. No test runner is installed or configured anywhere in the repository.") — validation for this phase is **manual UAT**, structured below so VALIDATION.md can be generated directly from this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — manual browser UAT only (per `.planning/codebase/TESTING.md`) |
| Config file | none |
| Quick run command | `npm run dev` (start Vite dev server, then manually exercise the page per the UAT steps below) |
| Full suite command | N/A — no automated suite exists; "full suite" for this phase means executing every UAT scenario below in one session before calling the phase done |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Manual UAT Steps | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ADMIN-01 | Admin sees all cities with capacity | manual-only | Login as Admin (`admin`/`admin123`) → open "Manajemen Kota" → verify all 8 seed cities (Pekanbaru, Medan, Palembang, Jambi, Padang, Dumai, Bengkalis, Rokan Hilir) appear in the table with correct `kapasitas` values matching `store.js:30-39` seed data | ❌ Wave 0 (page doesn't exist yet) |
| ADMIN-02 | Add new city via form with inline validation | manual-only | Click "+ Tambah Kota" → leave Nama Kota blank, attempt submit → verify "Nama kota wajib diisi." appears inline under the field, not as toast → fill valid nama+kapasitas → submit → verify toast "Kota berhasil ditambahkan." and new row appears in table | ❌ Wave 0 |
| ADMIN-03 | Edit existing city's name and capacity, change reflected everywhere | manual-only | Edit an existing city's `kapasitas` only → verify table updates immediately. Then: edit a city's `nama` (rename) that has at least one `permintaan` record referencing it (e.g. rename "Pekanbaru" using seed data) → after save, open `InputData.jsx` → verify the dropdown shows the NEW name only (old name gone) → check `RiwayatAktivitas.jsx`/any page displaying past `permintaan` for that city shows the NEW name, not the old one | ❌ Wave 0 |
| ADMIN-04 | Delete city — explicit block/warn/cascade for referenced cities | manual-only | (a) Attempt to delete a city WITH existing `permintaan`/`keputusan` references (e.g. seed city "Medan" has `keputusan` `KPT-002`) → verify "Tidak Bisa Menghapus Kota" modal appears with correct `{N}`/`{M}` counts, single "Mengerti" button, no destructive action proceeds. (b) Add a brand-new city with zero references → delete it → verify normal "Hapus Kota" confirm modal appears, deletion succeeds, toast "Kota berhasil dihapus." | ❌ Wave 0 |
| ADMIN-05 | View/update TBS stock value, immediately visible to recommendation engine | manual-only | Open "Manajemen Kota" → note current stock card value (seed: 150 ton) → click Edit → change to a new value → Simpan → verify card updates immediately. Then navigate to `KeputusanDistribusi.jsx` (as Manajer Distribusi) → verify the recommendation calculation (`computeRekomendasiDistribusi`) reflects the NEW stock value (e.g. `alokasi` totals constrained by new `stokTersisa`) without needing a page refresh | ❌ Wave 0 |
| ADMIN-06 | Duplicate city name shows inline error, not silent failure/crash | manual-only | Attempt to add a city with a `nama` that already exists (e.g. "Medan") → verify inline error "Kota dengan nama tersebut sudah ada." appears under Nama Kota field, modal stays open, no crash, no toast | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Manual smoke check in the running `npm run dev` instance — exercise the specific UAT scenario(s) the task implements before moving to the next task.
- **Per wave merge:** Re-run the full ADMIN-01..06 UAT table above end-to-end as one Admin session.
- **Phase gate:** All 6 UAT scenarios pass manually before `/gsd-verify-work`; additionally, log in as Manajer Distribusi and Tim Logistik once each to confirm the new "Manajemen Kota" menu item does NOT appear for those roles (Admin-only per D-03/menuByRole scoping) and that no redirect loop occurs (per `research/ARCHITECTURE.md`'s prescribed safe-modification check).

### Wave 0 Gaps
- [ ] `src/pages/ManajemenKota.jsx` — does not exist yet, full new file needed (covers ADMIN-01 through ADMIN-06's UI layer)
- [ ] `src/store.js` extensions — `updateKota` cascade-rename (D-02), `hapusKota` block-guard + new `getKotaReferenceCounts` helper (D-01) — covers ADMIN-03/ADMIN-04's data-integrity layer
- [ ] `src/utils/navigation.js` — `menuByRole.Admin` entry — covers page discoverability
- [ ] `src/App.jsx` — `pageRegistry`/`pathByPage` entries — covers page routing
- [ ] `src/components/Layout.jsx` — new `"city"` `IkonMenu` case — covers UI-SPEC's icon requirement
- [ ] No test framework gap to fill — this project intentionally has none; all verification above is manual UAT by design (`TESTING.md` confirms zero test runner installed, and no requirement in this phase calls for adding one)

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` confirmed in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | No | Unchanged by this phase — `cariAkun` plaintext comparison is pre-existing, explicitly out of scope to touch (per `CONCERNS.md`, `PITFALLS.md` Security Mistakes table) |
| V3 Session Management | No | Unchanged — `state.userAktif` session model untouched by this phase |
| V4 Access Control | Partial — UI-level only | This phase adds a new Admin-only page. Access control is enforced exactly like every other page: `menuByRole.Admin` gates menu visibility, `App.jsx`'s `allowedPages` memo (`App.jsx:104-107`) gates which `activePage` is rendered. This is **UI-level gating, not a real authorization boundary** (per `ARCHITECTURE.md`: "it does not prevent calling store mutators directly") — consistent with every other page in this app, not a regression introduced by this phase. No new control needed beyond following the existing additive-registration pattern (Pattern 4) correctly. |
| V5 Input Validation | Yes | Hand-rolled `validate(form) -> {field: message}` pattern (D-05/D-06) — city name required+non-empty (trimmed), capacity/stock must be a positive number via `Number(value) > 0` check. No schema validation library (consistent with rest of app, explicitly not introducing Zod/Yup per project constraints). |
| V6 Cryptography | No | Not applicable — this phase has no cryptographic operations (no password handling, no token generation) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Stored XSS via city name rendered unescaped | Tampering / Information Disclosure | React's default JSX text-content escaping already mitigates this — `{kota.nama}` rendered as JSX text (not via `dangerouslySetInnerHTML`) is automatically HTML-entity-escaped by React. Verify no new code path renders `nama` via `dangerouslySetInnerHTML` or as a raw DOM attribute (e.g., it should never end up in a `style` string or `href` built via string concatenation). `[CITED: react.dev — JSX escapes values embedded in it before rendering]` |
| CSV formula injection via city name (`=`, `+`, `-`, `@` prefix) in exported reports | Tampering | NOT mitigated by current `escapeCell` in `csv.js:72-78` (only escapes `,`/`"`/`\n` for CSV-structural correctness, not spreadsheet-formula execution). This is `SEC-01` in REQUIREMENTS.md's v2 (deferred) section — flagged here as Assumption A2 above; **not required for this phase** per the project's own scope decision, but the planner should NOT silently "fix" this as a drive-by change (would violate `PITFALLS.md` Pitfall 4's "don't refactor adjacent concerns" guidance) |
| Referential integrity bypass via direct store console access | Tampering | Out of scope — `ARCHITECTURE.md` confirms there is no real authorization boundary anywhere in this app (any role can call any store mutator from the browser console); this is a pre-existing, accepted characteristic of a client-only single-browser demo app, not a new risk introduced by this phase's `hapusKota`/`updateKota` extensions |
| Unvalidated numeric input for `kapasitas`/`stokTbs` causing `NaN` propagation into `computeRekomendasiDistribusi` | Denial of Service (degraded UX, not true DoS) | `Number(kapasitas) || 0` (existing pattern in `tambahKota`/`updateKota`/`setStokTbs`, `store.js:252,260,279`) already defends against `NaN` by falling back to `0` — the new page's `validateForm` (D-06) adds a pre-submit positive-number check on top of this existing store-side fallback, providing defense in depth |

## Sources

### Primary (HIGH confidence)
- `src/store.js` (full file, read directly this session) — exact `tambahKota`/`updateKota`/`hapusKota`/`getStokTbs`/`setStokTbs`/`getKapasitasKota` signatures and conventions (lines 239-284), plus `addKeputusan`/`removeKeputusan`/`restoreKeputusan` (lines 387-464) confirming `keputusan`/`riwayatKeputusan` divergence
- `src/App.jsx` (full file, read directly this session) — `pageRegistry`/`pathByPage`/`pageByPath` (lines 18-42), the four route/role `useEffect`s (lines 90-134), fallback render logic (line 151)
- `src/utils/navigation.js` (full file, read directly this session) — `menuByRole`/`getDefaultMenuByRole`
- `src/pages/ManajemenData.jsx` (full file, read directly this session) — exact CRUD page shape to copy structurally
- `src/pages/InputData.jsx` (full file, read directly this session) — `validate(form)` pattern, `daftarKota` consumption as a dropdown source
- `src/pages/KeputusanDistribusi.jsx` lines 1-70 (read directly this session) — confirms `kota_tujuan` is set from `targetKota.kota` (i.e. from `permintaan.kota` via ranking), and confirms `computeRekomendasiDistribusi` is called with `snapshot.daftarKota`/`snapshot.stokTbs` read from the subscribed snapshot, not a direct getter call
- `src/utils/distribusi.js` (full file, read directly this session) — `computeRekomendasiDistribusi`/`aggregatePermintaanRanking`/`computeKpiMetrics` signatures, confirming `daftarKota`/`stokTbs` are passed as plain arguments
- `src/components/Modal.jsx`, `MetricCard.jsx`, `Tabel.jsx`, `Card.jsx`, `PageHeader.jsx`, `SectionHeader.jsx`, `EmptyState.jsx`, `Tombol.jsx` (full files, read directly this session) — exact prop signatures for every shared component this phase reuses
- `src/components/Layout.jsx` lines 110-330 (read directly this session) — `IkonMenu` switch cases, confirming no `"city"` case exists yet
- `src/utils/csv.js` (full file, read directly this session) — confirms `escapeCell` only handles CSV-structural escaping, not formula-injection neutralization
- `package.json` (read directly this session) — confirms exact dependency versions, no test/lint scripts
- `.planning/config.json` (read directly this session) — confirms `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`
- `.claude/CLAUDE.md` (read directly this session) — project constraints (no new deps, reuse shared components, client-only scope)
- `.planning/phases/01-admin-city-stock-management/01-CONTEXT.md` — locked decisions D-01 through D-06
- `.planning/phases/01-admin-city-stock-management/01-UI-SPEC.md` — approved visual/copy/interaction contract
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — phase requirements ADMIN-01..06, v2-deferred TEST-01/SEC-01
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `CONCERNS.md`, `TESTING.md` — project-level codebase map (all read directly this session)
- `.planning/research/SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md` — project-level milestone research (all read directly this session)

### Secondary (MEDIUM confidence)
- React JSX auto-escaping behavior for XSS mitigation — general framework knowledge, well-established, not specific to this codebase but directly applicable `[CITED: react.dev]`

### Tertiary (LOW confidence)
- None — every claim in this research traces to a file read directly in this repository during this session, or to the already-approved CONTEXT.md/UI-SPEC.md artifacts. No WebSearch/Context7 lookups were needed since this is a "fit new work into an already-fully-read local codebase" question, not an ecosystem-evaluation question (consistent with the project-level `research/ARCHITECTURE.md`'s own framing).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all versions read directly from `package.json`
- Architecture: HIGH — every pattern traced to specific file/line ranges in this exact repo, cross-verified across `store.js`, `App.jsx`, `navigation.js`, `distribusi.js`, `KeputusanDistribusi.jsx`
- Pitfalls: HIGH — grounded in direct reads of `store.js`'s actual mutator behavior, not generic advice
- Referential integrity logic (D-01/D-02 implementation): HIGH for the mechanism (which collections, which fields), MEDIUM for one judgment call (Assumption A1, active-vs-full-history count for block-delete) — flagged explicitly for one-line confirmation during planning, not blocking

**Research date:** 2026-06-21
**Valid until:** Stable — this is a fully-local, dependency-free research pass with no external ecosystem claims subject to drift; valid until the next time `store.js`/`App.jsx`/`navigation.js` are modified by a different phase (re-verify line numbers if Phase 2-5 touch these files first)
