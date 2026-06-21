---
phase: 1
slug: admin-city-stock-management
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed — manual browser UAT only (confirmed via `.planning/codebase/TESTING.md`: "No test runner, test files, or test scripts exist anywhere in the repo") |
| **Config file** | none |
| **Quick run command** | `npm run dev` (start Vite dev server, then manually exercise the relevant UAT scenario before moving to the next task) |
| **Full suite command** | N/A — "full suite" for this phase means executing every UAT scenario in the Phase Requirements → Test Map below, end-to-end, in one Admin session |
| **Estimated runtime** | ~10-15 minutes for a full manual pass across all 6 requirements |

This project intentionally has zero test framework (no requirement in this phase calls for adding one — adding Vitest is tracked separately as deferred `TEST-01` in `.planning/REQUIREMENTS.md` v2). All verification below is manual UAT by design, not a coverage gap.

---

## Sampling Rate

- **After every task commit:** Manual smoke check in the running `npm run dev` instance — exercise the specific UAT scenario(s) the task implements before moving to the next task.
- **After every plan wave:** Re-run the full ADMIN-01..06 UAT table below end-to-end as one Admin session.
- **Before `/gsd-verify-work`:** All 6 UAT scenarios must pass manually, plus a role-isolation check (log in as Manajer Distribusi and Tim Logistik once each to confirm the new "Manajemen Kota" menu item does NOT appear for those roles, and that no redirect loop occurs).
- **Max feedback latency:** ~2 minutes per scenario (dev server hot-reload + manual click-through).

---

## Per-Task Verification Map

Task IDs are assigned once `/gsd-plan-phase` generates PLAN.md files; this table maps each requirement to its manual verification until then. The executor/checker should fill in real Task IDs as plans are created.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | ADMIN-01 | — | N/A | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ADMIN-02 | — | Inline validation rejects empty name | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ADMIN-03 | — | Rename cascades to all referencing records | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ADMIN-04 | — | Delete blocked when city is referenced | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ADMIN-05 | — | Stock update propagates to recommendation engine without refresh | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ADMIN-06 | — | Duplicate name rejected with inline error, no crash | manual | (manual UAT — see Manual-Only Verifications) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/pages/ManajemenKota.jsx` — does not exist yet, full new file needed (covers ADMIN-01 through ADMIN-06's UI layer)
- [ ] `src/store.js` extensions — `updateKota` cascade-rename (D-02: must update `permintaan[].kota`, `keputusan[].kota_tujuan`, AND `riwayatKeputusan[].kota_tujuan`), `hapusKota` block-guard + new `getKotaReferenceCounts` helper (D-01)
- [ ] `src/utils/navigation.js` — `menuByRole.Admin` entry for the new page
- [ ] `src/App.jsx` — `pageRegistry`/`pathByPage` entries for routing
- [ ] `src/components/Layout.jsx` — new `"city"` `IkonMenu` case per UI-SPEC

No test-framework Wave 0 gap to fill — this project intentionally has none; all verification is manual UAT by design.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sees all cities with capacity | ADMIN-01 | No test framework in repo | Login as Admin (`admin`/`admin123`) → open "Manajemen Kota" → verify all 8 seed cities (Pekanbaru, Medan, Palembang, Jambi, Padang, Dumai, Bengkalis, Rokan Hilir) appear in the table with correct `kapasitas` values matching `store.js:30-39` seed data |
| Add new city via form with inline validation | ADMIN-02 | No test framework in repo | Click "+ Tambah Kota" → leave Nama Kota blank, attempt submit → verify "Nama kota wajib diisi." appears inline under the field, not as toast → fill valid nama+kapasitas → submit → verify toast "Kota berhasil ditambahkan." and new row appears in table |
| Edit city's name/capacity, change reflected everywhere | ADMIN-03 | No test framework in repo | Edit an existing city's `kapasitas` only → verify table updates immediately. Then rename a city that has at least one `permintaan` record referencing it (e.g. "Pekanbaru" using seed data) → after save, open `InputData.jsx` → verify dropdown shows the NEW name only → check `RiwayatAktivitas.jsx`/any page displaying past `permintaan` for that city shows the NEW name, not the old one |
| Delete city — explicit block/warn/cascade for referenced cities | ADMIN-04 | No test framework in repo | (a) Attempt to delete a city WITH existing `permintaan`/`keputusan` references (e.g. seed city "Medan" has `keputusan` `KPT-002`) → verify "Tidak Bisa Menghapus Kota" modal appears with correct counts, single "Mengerti" button, no destructive action proceeds. (b) Add a brand-new city with zero references → delete it → verify normal "Hapus Kota" confirm modal appears, deletion succeeds, toast "Kota berhasil dihapus." |
| View/update TBS stock, immediately visible to recommendation engine | ADMIN-05 | No test framework in repo | Open "Manajemen Kota" → note current stock card value (seed: 150 ton) → click Edit → change value → Simpan → verify card updates immediately. Navigate to `KeputusanDistribusi.jsx` (as Manajer Distribusi) → verify `computeRekomendasiDistribusi` output reflects the NEW stock value without needing a page refresh |
| Duplicate city name shows inline error, not silent failure/crash | ADMIN-06 | No test framework in repo | Attempt to add a city with a `nama` that already exists (e.g. "Medan") → verify inline error "Kota dengan nama tersebut sudah ada." appears under Nama Kota field, modal stays open, no crash, no toast |

---

## Validation Sign-Off

- [x] All tasks have manual UAT verify steps mapped (no automated framework exists in this repo — see Test Infrastructure)
- [x] Sampling continuity: every requirement has an explicit manual verification step, no gaps
- [x] Wave 0 covers all MISSING references (new page, store extensions, navigation/routing, icon)
- [x] No watch-mode flags (manual UAT, not automated watch)
- [x] Feedback latency < 2 min per scenario
- [x] `nyquist_compliant: true` set in frontmatter (manual-only validation is an intentional, documented design choice for this dependency-free brownfield phase, not a coverage gap)

**Approval:** approved (2026-06-21) — derived from `01-RESEARCH.md` ## Validation Architecture section
