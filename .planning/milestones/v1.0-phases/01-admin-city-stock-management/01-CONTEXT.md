# Phase 1: Admin City & Stock Management - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin mendapatkan halaman nyata untuk mengelola daftar kota (nama + kapasitas) dan nilai stok TBS global, menggantikan kapabilitas yang sudah ada di `store.js` (`tambahKota`, `updateKota`, `hapusKota`, `setStokTbs`) tapi belum punya UI sama sekali. Termasuk penanganan eksplisit untuk integritas referensi saat kota di-rename atau dihapus (karena `permintaan`/`keputusan` mereferensikan kota lewat string nama tanpa foreign key).

</domain>

<decisions>
## Implementation Decisions

### Penghapusan & Rename Kota
- **D-01:** Hapus kota **diblokir total** jika masih ada `permintaan` atau `keputusan`/`riwayatKeputusan` yang mereferensikan kota itu (by nama). Admin harus bersihkan/pindahkan data terkait dulu sebelum kota bisa dihapus. Tidak ada mode "izinkan dengan peringatan" atau "cascade-delete".
- **D-02:** Edit nama kota (rename) **otomatis memperbarui semua referensi lama** — setiap entry di `state.permintaan` (field `kota`) dan `state.keputusan`/`state.riwayatKeputusan` (field `kota_tujuan`) yang match nama lama ikut diganti ke nama baru dalam mutasi yang sama. Data tetap nyambung, konsisten dengan cara pencocokan kota (by name).

### Penempatan & Navigasi
- **D-03:** Halaman baru berdiri sendiri (working name: "Manajemen Kota"), bukan tab/bagian di dalam halaman "Manajemen Data" yang sudah ada. Perlu entry menu baru untuk role Admin di `src/utils/navigation.js`, plus registrasi di `pageRegistry`/`pathByPage` (`src/App.jsx`).

### UX Edit Stok TBS
- **D-04:** Stok TBS (`state.stokTbs`, satu angka global, berbeda dari `kapasitas` per kota) ditampilkan & diedit lewat **card ringkasan tersendiri** dengan tombol edit — bukan inline quick-edit, bukan baris tabel. Diposisikan di halaman yang sama dengan daftar kota (di atas atau berdampingan dengan tabel).

### Validasi Form
- **D-05:** Error nama duplikat (dilempar oleh `tambahKota` sebagai `Error`) ditampilkan sebagai **inline error per field** di bawah field nama — konsisten dengan pola `validate(form) -> {field: message}` di `InputData.jsx`/`ManajemenData.jsx`. Bukan toast.
- **D-06:** Validasi form kota: nama wajib & unik (cek duplikat), kapasitas harus angka positif. **Tidak ada validasi tambahan** di luar dua itu — user mengonfirmasi cukup.

### Claude's Discretion
- Detail visual minor yang tidak dibahas: ikon menu, urutan kolom tabel, copy/teks tombol persis — boleh diputuskan saat planning/eksekusi mengikuti konvensi yang sudah ada di `ManajemenData.jsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning atau implementasi.**

### Project & Requirements
- `.planning/PROJECT.md` — Active requirements ADMIN-01..06, Constraints (no new deps, reuse shared components)
- `.planning/REQUIREMENTS.md` — REQ-ID ADMIN-01 s.d. ADMIN-06 (Admin City & Stock Management)

### Research (milestone ini)
- `.planning/research/SUMMARY.md` — rekomendasi: nol dependency baru, pola CRUD/store sudah cukup
- `.planning/research/ARCHITECTURE.md` — preseden CRUD page & router-registration yang aman
- `.planning/research/PITFALLS.md` — pitfall #3 (store-convention mismatch: kota dikunci oleh `nama`, bukan `getNextId`), pitfall #5 (referential integrity saat hapus/rename)

### Codebase Map
- `.planning/codebase/ARCHITECTURE.md` — arsitektur store (pub/sub, fake backend) & router manual
- `.planning/codebase/CONVENTIONS.md` — konvensi penamaan, error handling, validasi
- `.planning/codebase/CONCERNS.md` — gap fungsional admin city/stock (tidak ada UI sama sekali)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/ManajemenData.jsx` — preseden lengkap untuk bentuk halaman CRUD (Card, Tabel, Modal edit, Modal konfirmasi hapus, EmptyState, Tombol, useRipple) — halaman kota baru sebaiknya menyalin bentuk ini, bukan menciptakan pola baru
- `src/components/Card.jsx`, `Modal.jsx`, `Tabel.jsx`, `EmptyState.jsx`, `Tombol.jsx`, `PageHeader.jsx`, `SectionHeader.jsx` — komponen siap pakai, semua sudah konsumsi `tokens.css`
- `src/store.js:247-284` (`tambahKota`, `updateKota`, `hapusKota`, `getKapasitasKota`, `setStokTbs`) — mutator sudah ada lengkap dengan validasi duplikat (`throw new Error(...)`) dan `recordActivity` — TIDAK perlu method store baru untuk D-03/D-04, hanya perlu method tambahan/modifikasi untuk D-01 (cek referensi sebelum hapus) dan D-02 (cascade-rename)

### Established Patterns
- Snapshot-subscribe: `const [snapshot, setSnapshot] = useState(store.getState()); useEffect(() => store.subscribe(setSnapshot), [])` — dipakai di semua page
- Validasi form: fungsi `validate(form) -> {field: message}` dipanggil di `handleChange` dan sebelum submit (`InputData.jsx:51-91`, `ManajemenData.jsx:111-142`)
- `try/catch` di sekitar pemanggilan mutator yang bisa `throw` (pola untuk menangkap error duplikat dari `tambahKota`)
- Konvensi ID: kota dikunci oleh `nama` (string), BUKAN `getNextId` — jangan generate ID numerik untuk kota

### Integration Points
- `src/App.jsx` — tambahkan entry baru ke `pageRegistry` dan `pathByPage` (additive, 2 baris)
- `src/utils/navigation.js` — tambahkan entry menu baru ke `menuByRole.Admin` (additive, tidak menyentuh 4 `useEffect` routing yang fragile di `App.jsx:90-134`)
- `src/utils/distribusi.js:105` (`computeRekomendasiDistribusi`) — membaca `kapasitas`/`stokTbs` lewat `snapshot` yang di-subscribe oleh `KeputusanDistribusi.jsx`/`Dashboard.jsx`, BUKAN langsung `store.getStokTbs()` — artinya update lewat `setStokTbs`/`updateKota` otomatis ter-propagate ke mesin rekomendasi tanpa wiring tambahan
- D-02 (cascade-rename) perlu menyentuh `updateKota` (atau logika baru di sekitarnya) agar turut meng-update semua entry di `state.permintaan` (field `kota`) dan `state.keputusan`/`state.riwayatKeputusan` (field `kota_tujuan`) yang match nama lama
- D-01 (blokir hapus) perlu query baru: cek apakah ada entry di `state.permintaan` (field `kota`) atau `state.keputusan`/`state.riwayatKeputusan` (field `kota_tujuan`) yang match nama kota sebelum mengizinkan `hapusKota`

</code_context>

<specifics>
## Specific Ideas

- Nama halaman: "Manajemen Kota" (working name, boleh disesuaikan saat planning selama jelas terpisah dari "Manajemen Data")
- Card ringkasan stok TBS ditempatkan di atas atau berdampingan dengan tabel kota pada halaman yang sama — bukan halaman/route terpisah

</specifics>

<deferred>
## Deferred Ideas

None — tidak ada scope creep yang muncul selama diskusi. Semua pertanyaan tetap dalam batas Phase 1 (ADMIN-01..06).

</deferred>

---

*Phase: 1-Admin City & Stock Management*
*Context gathered: 2026-06-21*
