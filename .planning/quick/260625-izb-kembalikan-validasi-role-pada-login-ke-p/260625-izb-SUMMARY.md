---
phase: quick-260625-izb
plan: 01
subsystem: auth
tags: [express, prisma, jwt, bcrypt, react, anti-enumeration]

# Dependency graph
requires:
  - phase: 09-01
    provides: "JWT-backed REST login (POST /auth/login), generic-401 anti-enumeration pattern, Login.jsx role state"
provides:
  - "verifyLogin(username, password, role) rejects role mismatch via the same null path as wrong-password/unknown-user"
  - "POST /auth/login requires role in body (400 'Role wajib diisi.' if missing) and passes it through to verifyLogin"
  - "store.login(username, password, role) and Login.jsx send the selected role pill back to v1.0 enforcement behavior"
affects: [auth, login, Phase 7 (Auth & Authorization), Phase 9-01 (Login.jsx REST migration)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-mismatch-as-null: new validation rules that must not leak via distinct error messages get folded into the existing generic-401 null-return path instead of adding a new branch/message"

key-files:
  created: []
  modified:
    - server/src/services/akunService.js
    - server/src/routes/authRoutes.js
    - src/store.js
    - src/pages/Login.jsx

key-decisions:
  - "Role mismatch maps to the exact same null return as wrong-password (no new error type), preserving T-07-ENUM anti-enumeration for free at the route layer."
  - "Missing role at the route level returns a distinct 400 'Role wajib diisi.' (format-validation, not a credential-guessing vector) rather than folding into the generic 401."
  - "Did not add a roleOptions.includes(role) guard in the route — an invalid role string naturally fails to match any account and falls through to the generic 401, avoiding a new branch that could leak info."

requirements-completed: [AUTH-ROLE-MISMATCH]

# Metrics
duration: 12min
completed: 2026-06-25
status: complete
---

# Quick Task 260625-izb: Kembalikan Validasi Role pada Login Summary

**Role mismatch saat login kini ditolak (401, pesan identik dengan password salah) — membalik regresi Phase 9-01 yang membuat role pill jadi murni kosmetik, tanpa membuka kebocoran anti-enumeration baru.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 4/4 selesai — 3 task auto ter-commit, Task 4 (checkpoint:human-verify) diverifikasi live dan approved
- **Files modified:** 4

## Accomplishments

- `verifyLogin` (backend service) sekarang menerima `role` dan mengembalikan `null` saat `akun.role !== role`, persis di jalur yang sama dengan password salah / username tidak ada.
- `POST /auth/login` men-destructure `role` dari body, menolak dengan 400 `"Role wajib diisi."` saat kosong, dan mem-passing role ke `verifyLogin` tanpa mengubah cabang generic-401 yang sudah ada.
- `store.login` dan `Login.jsx` kini mengirim `role` (state pill yang sudah ada di form) sampai ke body request — rantai role utuh dari UI sampai ke service layer.

## Task Commits

Setiap task di-commit atomically:

1. **Task 1: Tambahkan validasi role di verifyLogin (backend service)** - `7e2762f` (fix)
2. **Task 2: Passing & validasi role di POST /auth/login (backend route)** - `2d7f992` (fix)
3. **Task 3: Alirkan role dari Login.jsx melalui store.login (frontend)** - `c8e83d8` (fix)

**Plan metadata:** (commit terpisah setelah SUMMARY ini dibuat)

## Files Created/Modified

- `server/src/services/akunService.js` - `verifyLogin` menerima param `role`; mismatch -> `null`; JSDoc diperbarui agar akurat.
- `server/src/routes/authRoutes.js` - Handler `/login` men-destructure `role`, menambah guard 400 saat kosong, memanggil `verifyLogin` dengan 3 argumen.
- `src/store.js` - `store.login(username, password, role)` mengirim `role` di body `apiFetch`.
- `src/pages/Login.jsx` - `handleSubmit` memanggil `store.login(username, password, role)` menggunakan state `role` yang sudah ada.

## Decisions Made

- Role mismatch dipetakan ke jalur `null` yang sama dengan kredensial salah (tidak ada error/pesan baru) — ini yang menjaga anti-enumeration tetap utuh tanpa logika percabangan tambahan di route layer.
- Role kosong di body request ditolak dengan 400 yang berbeda pesan dari 401 generik — ini bukan vektor credential-guessing (field hilang, bukan kombinasi kredensial), jadi aman untuk punya pesan sendiri.
- Sengaja TIDAK menambah validasi `roleOptions.includes(role)` di route — role yang tidak valid otomatis tidak match akun manapun dan jatuh ke 401 generik secara alami; menambah cabang "role tidak valid" terpisah justru berpotensi membocorkan info melalui perbedaan response.

## Deviations from Plan

None - plan dieksekusi tepat seperti yang ditulis. Tidak ada auto-fix Rule 1-3, tidak ada keputusan arsitektur Rule 4.

## Issues Encountered

None.

## Verification Status

**Tasks 1-3 (automated):** Semua verifikasi otomatis di level task PASSED:
- Task 1: `verifyLogin('admin','admin123','Admin')` -> objek akun role Admin; `verifyLogin('admin','admin123','Tim Logistik')` -> `null`. Confirmed via inline Node script.
- Task 2: `node --check` pada `authRoutes.js` lolos; grep konfirmasi pesan "Role wajib diisi." dan pemanggilan `verifyLogin(username, password, role)` ada.
- Task 3: grep konfirmasi `store.login` menerima 3 parameter, body apiFetch berisi `role`, dan `Login.jsx` memanggil dengan 3 argumen.
- Sanity ping tambahan: `POST /auth/login` dengan body kosong terhadap backend live (port 4000) mengembalikan 400 sesuai ekspektasi guard username/password yang sudah ada.

**Task 4 (checkpoint:human-verify, gate=blocking) — APPROVED.** Keenam kasus live (4 via curl ke backend + 2 via Playwright ke UI) dijalankan terhadap backend (http://localhost:4000) dan frontend (http://localhost:5173) yang sudah berjalan, dengan hasil:

1. Role benar -> 200: `{"username":"admin","password":"admin123","role":"Admin"}` -> 200, `token` + `user.role === "Admin"`. **CONFIRMED.**
2. Role salah -> 401 generik: `{"username":"admin","password":"admin123","role":"Tim Logistik"}` -> 401, `error: "Username atau password salah."`. **CONFIRMED.**
3. Password salah -> 401 dengan teks IDENTIK kasus 2: `{"username":"admin","password":"wrongpass","role":"Admin"}` -> 401, `error: "Username atau password salah."` (teks identik dengan kasus 2, anti-enumeration terjaga). **CONFIRMED.**
4. Role hilang -> 400: `{"username":"admin","password":"admin123"}` -> 400, `error: "Role wajib diisi."`. **CONFIRMED.**
5. UI (Playwright): role pill "Tim Logistik" + admin/admin123 -> tetap di /login, error "Username atau password salah" muncul di field password. **CONFIRMED.**
6. UI (Playwright): role pill "Admin" + admin/admin123 -> berhasil masuk ke /dashboard. **CONFIRMED.**

Anti-enumeration terbukti utuh: teks error kasus 2 dan kasus 3 identik persis.

**Plan ini COMPLETE.** Checkpoint Task 4 di-approve setelah verifikasi live di atas dikonfirmasi sesuai ekspektasi (lihat resume-signal di PLAN.md Task 4).

## User Setup Required

None - tidak ada konfigurasi layanan eksternal yang diperlukan. Backend dan frontend sudah berjalan terhadap database yang sudah ter-seed.

## Next Phase Readiness

- Tidak ada blocker. Quick task ini selesai sepenuhnya — checkpoint Task 4 sudah di-approve dengan keenam kasus live verification CONFIRMED.
- Tidak ada perubahan pada `registerAkun`, middleware RBAC (`requireAuth`/`requireRole`), atau halaman selain `Login.jsx` — perubahan terisolasi murni pada jalur login.

---
*Quick task: 260625-izb*
*Completed: 2026-06-25 — semua 4 task selesai (3 auto + 1 checkpoint approved)*

## Self-Check: PASSED

All claimed files found, all claimed commit hashes (7e2762f, 2d7f992, c8e83d8) found in git log.
