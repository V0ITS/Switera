---
phase: quick-260625-izb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/src/services/akunService.js
  - server/src/routes/authRoutes.js
  - src/store.js
  - src/pages/Login.jsx
autonomous: false
requirements: [AUTH-ROLE-MISMATCH]

must_haves:
  truths:
    - "Login dengan username+password benar TAPI role salah ditolak (401)"
    - "Pesan 401 untuk role-salah identik dengan pesan password-salah (anti-enumeration tetap terjaga)"
    - "Login dengan username+password+role yang semuanya benar tetap berhasil (200)"
    - "Request login tanpa field role ditolak dengan 400 'Role wajib diisi.'"
  artifacts:
    - path: "server/src/services/akunService.js"
      provides: "verifyLogin menerima param role dan mengembalikan null saat role tidak cocok"
      contains: "akun.role"
    - path: "server/src/routes/authRoutes.js"
      provides: "POST /login mem-passing role ke verifyLogin + validasi 400 saat role kosong"
    - path: "src/store.js"
      provides: "store.login mengirim role di body /auth/login"
    - path: "src/pages/Login.jsx"
      provides: "handleSubmit memanggil store.login dengan role"
  key_links:
    - from: "src/pages/Login.jsx"
      to: "src/store.js"
      via: "store.login(username, password, role)"
      pattern: "store\\.login\\(username, password, role\\)"
    - from: "src/store.js"
      to: "server/src/routes/authRoutes.js"
      via: "apiFetch POST /auth/login dengan body berisi role"
      pattern: "body: \\{ username, password, role \\}"
    - from: "server/src/routes/authRoutes.js"
      to: "server/src/services/akunService.js"
      via: "verifyLogin(username, password, role)"
      pattern: "verifyLogin\\(username, password, role\\)"
---

<objective>
Kembalikan validasi role pada login ke perilaku v1.0: tolak login bila role yang dipilih
di form tidak cocok dengan role akun yang sebenarnya — sambil MEMPERTAHANKAN properti
anti-enumeration (pesan 401 yang sama persis untuk username-tidak-ada / password-salah /
role-salah, sehingga penyerang tidak bisa membedakan "password benar tapi role salah"
dari "password salah").

Purpose: Saat migrasi backend Phase 9 (09-01), validasi role v1.0 hilang — POST /auth/login
hanya memeriksa username+password dan mengembalikan role asli akun apa pun role yang dipilih,
membuat role pill jadi murni kosmetik. User secara eksplisit memutuskan mengembalikan
perilaku v1.0 (tolak saat role mismatch) setelah live testing membuktikan mismatch tidak
memblokir login. Ini membalik keputusan 09-01 yang spesifik itu.

Output: Rantai role mengalir dari Login.jsx -> store.login -> POST /auth/login -> verifyLogin;
mismatch role memetakan ke jalur `null` yang sudah ada (sama dengan password salah), jadi
cabang generic-401 yang ada di route menanganinya identik tanpa logika percabangan baru.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

# Sumber yang sudah dibaca planner — referensi langsung untuk executor:
@server/src/services/akunService.js
@server/src/routes/authRoutes.js
@src/store.js
@src/pages/Login.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Tambahkan validasi role di verifyLogin (backend service)</name>
  <files>server/src/services/akunService.js</files>
  <action>
Ubah signature `verifyLogin(username, password)` menjadi `verifyLogin(username, password, role)`.
Setelah pengecekan `bcrypt.compare` berhasil (saat ini langsung `return stripPassword(akun)`),
tambahkan satu pengecekan: jika `akun.role !== role`, `return null` — jalur null yang SAMA
PERSIS yang sudah dipakai untuk username-tidak-ada dan password-salah. Jangan menambah pesan
atau tipe error baru; cukup `return null`. Inilah yang menjaga anti-enumeration secara gratis:
authRoutes.js akan memetakan null ini ke pesan generic-401 yang identik.

Perbarui JSDoc blok komentar di atas fungsi (saat ini lines 12-22) agar akurat lagi: hapus/ubah
kalimat yang menyatakan fungsi ini TIDAK mengambil argumen role dan bahwa login diverifikasi
hanya dari username+password. Ganti dengan deskripsi bahwa role kini menjadi bagian kriteria
match (mismatch role -> null, sama dengan kredensial salah, demi anti-enumeration). Pertahankan
referensi threat tag yang relevan (mis. T-07-ENUM) bila menyebut anti-enumeration.

JANGAN sentuh `registerAkun`, `getNextAkunId`, atau `stripPassword`.
  </action>
  <verify>
    <automated>cd server && node --input-type=module -e "import { verifyLogin } from './src/services/akunService.js'; const a = await verifyLogin('admin','admin123','Admin'); const b = await verifyLogin('admin','admin123','Tim Logistik'); if (a && a.role==='Admin' && b===null) { console.log('OK'); } else { console.error('FAIL', {a, b}); process.exit(1); }"</automated>
  </verify>
  <done>verifyLogin('admin','admin123','Admin') mengembalikan objek akun (role Admin, tanpa field password); verifyLogin('admin','admin123','Tim Logistik') mengembalikan null. JSDoc tidak lagi menyatakan fungsi mengabaikan role.</done>
</task>

<task type="auto">
  <name>Task 2: Passing & validasi role di POST /auth/login (backend route)</name>
  <files>server/src/routes/authRoutes.js</files>
  <action>
Di handler `router.post("/login", ...)`: ubah destructuring `const { username, password } = req.body ?? {};`
menjadi mengikutsertakan `role`. Setelah guard `if (!username || !password)` yang ada, tambahkan
guard terpisah: jika role falsy, kembalikan `res.status(400).json({ error: "Role wajib diisi." })`.
Ini pesan validasi-format (field hilang) yang SENGAJA berbeda dari pesan credential-mismatch generik
— "field hilang" bukan vektor credential-guessing, jadi tidak melanggar anti-enumeration.

Ubah pemanggilan `verifyLogin(username, password)` menjadi `verifyLogin(username, password, role)`.
JANGAN ubah cabang `if (!akun)` generic-401 maupun pesannya ("Username atau password salah.") —
justru tidak menyentuhnya inilah yang membuat mismatch-role memetakan ke pesan yang identik dan
menjaga anti-enumeration. Jangan tambah pengecekan `roleOptions.includes(role)` di sini: role
yang tidak valid akan otomatis tidak cocok dengan akun mana pun dan jatuh ke generic-401 — menambah
cabang "role tidak valid" yang berbeda justru akan membocorkan informasi (anti-enumeration). Biarkan
handler `/register` apa adanya.
  </action>
  <verify>
    <automated>cd server && node --check src/routes/authRoutes.js && grep -q 'Role wajib diisi.' src/routes/authRoutes.js && grep -q 'verifyLogin(username, password, role)' src/routes/authRoutes.js && echo OK</automated>
  </verify>
  <done>Handler men-destructure role, mengembalikan 400 "Role wajib diisi." saat role kosong, dan memanggil verifyLogin dengan tiga argumen. Cabang generic-401 dan pesannya tidak berubah.</done>
</task>

<task type="auto">
  <name>Task 3: Alirkan role dari Login.jsx melalui store.login (frontend)</name>
  <files>src/store.js, src/pages/Login.jsx</files>
  <action>
Di `src/store.js`, method `async login(username, password)` (lines 273-284): ubah signature menjadi
`async login(username, password, role)` dan ubah body apiFetch dari `body: { username, password }`
menjadi `body: { username, password, role }`. Jangan ubah `auth: false`, `setToken`, atau
`setUserAktif` — hanya tambahkan role ke body.

Di `src/pages/Login.jsx`, `handleSubmit` (line 64): ubah `await store.login(username, password);`
menjadi `await store.login(username, password, role);`. Variabel `role` adalah state yang sudah ada
(line 18) dan sudah divalidasi non-kosong lebih awal di fungsi yang sama (lines 54-56), jadi tidak
perlu validasi tambahan. Komentar stale di lines 67-70 (yang menyebut server mengembalikan 401 untuk
"wrong-role") kini menjadi AKURAT kembali setelah fix ini — biarkan komentar tersebut apa adanya,
atau rapikan seperlunya agar tetap menyatakan satu pesan 401 generik mencakup
unknown-user/wrong-password/wrong-role.
  </action>
  <verify>
    <automated>grep -q 'async login(username, password, role)' src/store.js && grep -q 'body: { username, password, role }' src/store.js && grep -q 'store.login(username, password, role)' src/pages/Login.jsx && echo OK</automated>
  </verify>
  <done>store.login menerima role dan mengirimnya di body; Login.jsx memanggil store.login dengan tiga argumen menggunakan state role yang ada.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Validasi role pada login dikembalikan ke perilaku v1.0 dengan anti-enumeration tetap terjaga. Backend (port 4000) dan frontend (Vite, port 5173) sudah berjalan terhadap Postgres yang ter-seed (switera-db-1) — tidak perlu dibuat ulang.</what-built>
  <how-to-verify>
Backend sudah berjalan di http://localhost:4000. Jalankan 4 kasus berikut (mis. via curl/PowerShell Invoke-RestMethod) dan bandingkan dengan ekspektasi:

1. Role benar -> 200:
   POST http://localhost:4000/auth/login  body: {"username":"admin","password":"admin123","role":"Admin"}
   Harapkan: status 200, response berisi token + user.role = "Admin".

2. Role salah -> 401 (pesan generik):
   POST /auth/login  body: {"username":"admin","password":"admin123","role":"Tim Logistik"}
   Harapkan: status 401, error = "Username atau password salah."

3. Password salah -> 401 (pesan IDENTIK dengan kasus 2 — bukti anti-enumeration):
   POST /auth/login  body: {"username":"admin","password":"wrongpass","role":"Admin"}
   Harapkan: status 401, error = "Username atau password salah." (teks HARUS sama persis dengan kasus 2).

4. Role hilang -> 400:
   POST /auth/login  body: {"username":"admin","password":"admin123"}
   Harapkan: status 400, error = "Role wajib diisi."

Lalu cek di UI (http://localhost:5173): login admin/admin123 dengan role pill "Tim Logistik" harus GAGAL (pesan "Username atau password salah." pada field password); dengan role pill "Admin" harus berhasil masuk ke dashboard.

Konfirmasi khusus untuk kasus 2 vs 3: teks error keduanya harus identik — jika berbeda, anti-enumeration bocor dan harus diperbaiki.
  </how-to-verify>
  <resume-signal>Ketik "approved" jika keempat kasus sesuai (terutama pesan kasus 2 == kasus 3), atau jelaskan kasus mana yang menyimpang.</resume-signal>
</task>

</tasks>

<verification>
- verifyLogin menolak role mismatch via jalur null yang sama dengan password salah (tidak ada pesan/error baru).
- POST /auth/login: 200 saat semua benar, 401 generik saat role/password salah (pesan identik), 400 saat role kosong.
- Rantai role utuh: Login.jsx -> store.login -> body apiFetch -> verifyLogin.
- Komentar JSDoc akunService dan komentar Login.jsx tidak lagi stale/kontradiktif terhadap perilaku baru.
</verification>

<success_criteria>
- [ ] admin/admin123 + role "Admin" -> 200
- [ ] admin/admin123 + role "Tim Logistik" -> 401 "Username atau password salah."
- [ ] admin/wrongpass + role "Admin" -> 401 dengan teks identik kasus di atas (anti-enumeration terbukti)
- [ ] login tanpa role -> 400 "Role wajib diisi."
- [ ] UI: role mismatch memblokir login; role cocok berhasil masuk dashboard
</success_criteria>

<output>
Create `.planning/quick/260625-izb-kembalikan-validasi-role-pada-login-ke-p/260625-izb-SUMMARY.md` when done
</output>
