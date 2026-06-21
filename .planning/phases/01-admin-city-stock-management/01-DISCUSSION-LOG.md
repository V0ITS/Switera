# Phase 1: Admin City & Stock Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 1-Admin City & Stock Management
**Areas discussed:** Hapus kota dengan data terkait, Rename kota, Penempatan halaman, UX edit stok TBS, Validasi nama duplikat & form

---

## Hapus kota dengan data terkait

| Option | Description | Selected |
|--------|-------------|----------|
| Blokir total | Tidak bisa dihapus selama masih ada data terkait; Admin harus bersihkan/pindahkan dulu | ✓ |
| Izinkan dengan peringatan | Tampilkan jumlah data yang akan jadi yatim, minta konfirmasi, lalu kota tetap terhapus | |
| Cascade | Turut menghapus/membatalkan semua permintaan & keputusan terkait kota itu | |

**User's choice:** Blokir total
**Notes:** Dipilih karena paling aman — tidak ada data yatim/dangling reference.

---

## Rename kota yang sudah punya data historis

| Option | Description | Selected |
|--------|-------------|----------|
| Update otomatis | Semua referensi lama (permintaan.kota, keputusan.kota_tujuan) ikut diganti ke nama baru | ✓ |
| Biarkan apa adanya | Data lama tetap pakai nama lama (berisiko yatim) | |

**User's choice:** Update otomatis
**Notes:** Konsisten dengan cara kota dicocokkan (by name, tanpa foreign key) — kalau tidak di-cascade, kapasitas kota itu akan diam-diam jadi 0 di mesin rekomendasi untuk data lama.

---

## Penempatan halaman

| Option | Description | Selected |
|--------|-------------|----------|
| Halaman/menu baru "Manajemen Kota" | Berdiri sendiri, terpisah dari "Manajemen Data" | ✓ |
| Tab/bagian kedua di Manajemen Data | Digabung ke halaman yang sudah ada | |

**User's choice:** Halaman/menu baru "Manajemen Kota"
**Notes:** Domain berbeda dari "Manajemen Data" (yang fokus ke permintaan).

---

## UX edit stok TBS

| Option | Description | Selected |
|--------|-------------|----------|
| Card ringkasan tersendiri | Card "Stok TBS Tersedia" di atas daftar kota dengan tombol edit | ✓ |
| Inline quick-edit | Seperti pola quick-edit jumlah di ManajemenData | |

**User's choice:** Card ringkasan tersendiri
**Notes:** Stok TBS adalah satu nilai global, bukan baris tabel, sehingga card ringkasan lebih sesuai daripada inline-edit di dalam tabel.

---

## Validasi nama duplikat & form

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error per field | Konsisten dengan pola InputData/ManajemenData | ✓ |
| Toast notifikasi | Notifikasi toast, bukan error inline | |

**User's choice:** Inline error per field

**Validasi tambahan di luar "nama wajib & unik" dan "kapasitas harus angka positif":**

| Option | Selected |
|--------|----------|
| Tidak ada | ✓ |
| Ya, ada tambahan | |

**User's choice:** Tidak ada — dua validasi itu sudah cukup.

---

## Claude's Discretion

- Detail visual minor: ikon menu, urutan kolom tabel, copy/teks tombol persis — tidak dibahas, diputuskan saat planning/eksekusi mengikuti konvensi `ManajemenData.jsx`.

## Deferred Ideas

None — seluruh diskusi tetap dalam batas Phase 1 (ADMIN-01..06).
