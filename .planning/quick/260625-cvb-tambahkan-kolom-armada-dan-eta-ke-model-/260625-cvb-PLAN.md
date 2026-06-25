---
phase: quick-260625-cvb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/prisma/schema.prisma
  - server/src/services/keputusanService.js
  - server/src/schemas/keputusanSchemas.js
  - server/src/routes/keputusanRoutes.verify.mjs
autonomous: true
requirements: [STATUS-ARMADA-ETA]

must_haves:
  truths:
    - "armada and eta submitted via PUT /keputusan/:id persist to the database"
    - "A subsequent GET /keputusan returns the persisted armada and eta on the row"
    - "armada and eta round-trip through both Keputusan and RiwayatKeputusan tables"
    - "armada and eta are nullable — existing rows and updates without them are unaffected"
  artifacts:
    - path: "server/prisma/schema.prisma"
      provides: "armada String? and eta String? on both Keputusan and RiwayatKeputusan models"
      contains: "armada String?"
    - path: "server/src/services/keputusanService.js"
      provides: "armada/eta pass-through in toApi and toDb mappers"
    - path: "server/src/schemas/keputusanSchemas.js"
      provides: "optional armada/eta on keputusanUpdateSchema"
    - path: "server/src/routes/keputusanRoutes.verify.mjs"
      provides: "assertion that PUT armada+eta persists and round-trips on next GET"
  key_links:
    - from: "server/src/services/keputusanService.js"
      to: "server/prisma/schema.prisma"
      via: "toDb writes data.armada/data.eta to the new schema columns"
      pattern: "data\\.armada|data\\.eta"
---

<objective>
Add `armada` and `eta` fields to the Keputusan distribution model so the
status-tracking flow ("Dalam Pengiriman" requires armada + ETA) persists
end-to-end through the new REST API instead of silently dropping the data on
reload.

Purpose: StatusDistribusi.jsx requires armada (vehicle/driver) and eta
(estimated arrival date) before saving status "dalam-pengiriman" — a
validated v1.0 requirement — but the Phase 6 Prisma schema never modeled
these columns. Submitting them via PUT /keputusan/:id currently loses them
(a regression vs the v1.0 localStorage behavior). This closes the gap
backend-side only; the Phase 9 frontend executors handle the client.

Output: Two nullable string columns (`armada`, `eta`) on both Keputusan and
RiwayatKeputusan, a Prisma migration applied to the running switever-db
Postgres, mapper + schema wiring so the fields pass through on create AND
update, and a verify-script assertion proving the round-trip.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./.claude/CLAUDE.md
@server/prisma/schema.prisma
@server/src/services/keputusanService.js
@server/src/schemas/keputusanSchemas.js
@server/src/routes/keputusanRoutes.verify.mjs

# Consumer reference (DO NOT MODIFY — frontend is Phase 9's scope):
# src/pages/StatusDistribusi.jsx lines 78-79, 110-112, 291 — confirms:
#   - eta comes from an <input type="date">, so it is a plain "YYYY-MM-DD"
#     string (model it as String?, matching the existing tanggalKeputusan
#     String convention — NOT a DateTime).
#   - armada is a trimmed plain string.
#   - both are single-word keys, so the snake_case API shape and the
#     camelCase Prisma column share the same identifier ("armada"/"eta").
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add armada/eta columns to schema and run migration</name>
  <files>server/prisma/schema.prisma</files>
  <behavior>
    - After migration, the Keputusan table has nullable armada and eta text columns.
    - After migration, the RiwayatKeputusan table has nullable armada and eta text columns.
    - Existing seeded rows survive the migration with NULL armada/eta (additive, non-destructive).
  </behavior>
  <action>
    Add two nullable string fields, `armada String?` and `eta String?`, to
    BOTH the Keputusan model and the RiwayatKeputusan model in
    server/prisma/schema.prisma. Place them after the existing scalar fields
    (e.g. after `status`) and before the `waktu*` DateTime fields, in both
    models, so the two model definitions stay structurally parallel.

    Model eta as `String?` (not DateTime): the frontend supplies it from an
    `<input type="date">` as a plain "YYYY-MM-DD" string, identical to how
    the existing `tanggalKeputusan String` field is handled. Model armada as
    `String?` (free-text vehicle/driver label).

    Then generate and apply the migration against the already-running,
    already-seeded Docker Postgres (switera-db-1) — do NOT recreate the
    container or reseed. From the server/ directory run:
    `npx prisma migrate dev --name add_armada_eta_keputusan`
    This both creates the migration SQL and runs `prisma generate`, so the
    Prisma Client picks up the new fields. The migration MUST be additive
    (ADD COLUMN ... NULL) — confirm Prisma did not emit any data-loss /
    DROP / NOT NULL warning before accepting it. If the backend dev server
    (port 4000) was holding a client connection, restart it afterward so it
    loads the regenerated client.
  </action>
  <verify>
    <automated>cd server && grep -c 'armada String?' prisma/schema.prisma | grep -qx 2 && grep -c 'eta String?' prisma/schema.prisma | grep -qx 2 && ls prisma/migrations | grep -q add_armada_eta_keputusan && echo MIGRATION_OK</automated>
  </verify>
  <done>schema.prisma has `armada String?` and `eta String?` on both Keputusan and RiwayatKeputusan (2 occurrences each); a new migration directory named *add_armada_eta_keputusan exists and applied cleanly to switera-db-1 with no data-loss warning; Prisma Client regenerated.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire armada/eta through service mappers and update schema</name>
  <files>server/src/services/keputusanService.js, server/src/schemas/keputusanSchemas.js</files>
  <behavior>
    - toApi includes armada and eta on the returned snake_case object.
    - toDb writes data.armada / data.eta only when the key is present on the entry (hasOwnProperty guard), so partial updates do not clobber them.
    - keputusanUpdateSchema accepts optional armada (string) and eta (string).
    - addKeputusan (create) and updateKeputusan (PUT) both carry armada/eta through via toDb.
  </behavior>
  <action>
    In server/src/services/keputusanService.js:

    1. In `toApi(row)`, add `armada: row.armada` and `eta: row.eta` to the
       returned object. armada/eta are single-word keys so no snake_case
       conversion is needed — they map identically to the API shape the
       frontend (item.armada / item.eta) reads.

    2. In `toDb(entry)`, add two more present-key guards mirroring the
       existing pattern exactly: if the entry hasOwnProperty "armada",
       set `data.armada = entry.armada`; if it hasOwnProperty "eta", set
       `data.eta = entry.eta`. Use the same
       `Object.prototype.hasOwnProperty.call(entry, "...")` form as the
       surrounding fields so partial PUT updates only touch supplied keys.
       Do NOT coerce — both are plain strings.

    No change is needed to addKeputusan / updateKeputusan / restoreKeputusan
    bodies: they already spread `toDb(entry)` into the create/update data, so
    once toDb passes armada/eta through, create and update both persist them
    to both tables automatically.

    In server/src/schemas/keputusanSchemas.js:

    3. Add `armada: z.string().optional()` and `eta: z.string().optional()`
       to `keputusanUpdateSchema`. Keep them permissive (no min(1)) — the
       frontend only sends them when transitioning to "dalam-pengiriman", and
       the required/non-empty enforcement for that case already lives in the
       frontend's validateModalForm. The backend schema's job here is only to
       allow the fields through validation rather than strip them.

    Leave keputusanCreateSchema unchanged (the create path does not currently
    submit armada/eta; toDb's hasOwnProperty guard simply omits them, leaving
    the columns NULL on create — correct behavior).
  </action>
  <verify>
    <automated>cd server && node --input-type=module -e "import {keputusanUpdateSchema} from './src/schemas/keputusanSchemas.js'; const r=keputusanUpdateSchema.safeParse({status:'dalam-pengiriman',armada:'Truk B 1234 XY',eta:'2026-07-01'}); if(!r.success||r.data.armada!=='Truk B 1234 XY'||r.data.eta!=='2026-07-01'){console.error('SCHEMA_FAIL',JSON.stringify(r));process.exit(1)} console.log('SCHEMA_OK')" && grep -q 'armada: row.armada' src/services/keputusanService.js && grep -q 'data.armada = entry.armada' src/services/keputusanService.js && echo MAPPER_OK</automated>
  </verify>
  <done>toApi returns armada/eta; toDb passes armada/eta through under hasOwnProperty guards; keputusanUpdateSchema parses a payload with armada+eta and preserves both values; create path remains unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Extend verify script to prove armada/eta round-trip</name>
  <files>server/src/routes/keputusanRoutes.verify.mjs</files>
  <behavior>
    - A single PUT /keputusan/:id with { status, armada, eta } persists both fields.
    - A subsequent GET /keputusan returns the same row with the persisted armada and eta.
  </behavior>
  <action>
    Add a new, self-contained assertion block to
    server/src/routes/keputusanRoutes.verify.mjs that does NOT disturb the
    existing concurrent-race test (which deliberately fires two competing
    PUTs and consumes the created row's single legitimate transition).

    Because step (5)'s race test already transitions createdId to
    "dalam-pengiriman" and step (6) DELETEs it, create a SEPARATE decision
    for this round-trip check:

    1. POST /keputusan with the manajer token (valid body, e.g. kota_tujuan
       TEST_KOTA, volume_tbs 30, a distinctive diputuskan_oleh sentinel like
       "__ArmadaEtaVerifyTemp__") -> capture its id into a new variable
       (e.g. armadaId). Track armadaId for cleanup in the finally block
       alongside createdId.

    2. PUT /keputusan/{armadaId} with the logistik token and body
       { status: "dalam-pengiriman", armada: "Truk B 1234 XY", eta:
       "2026-07-01" } -> expect 200. Assert the PUT response body's armada
       and eta equal the submitted values.

    3. GET /keputusan with any authenticated token, find the row with
       id === armadaId, and assert row.armada === "Truk B 1234 XY" and
       row.eta === "2026-07-01" — this is the persistence/round-trip proof
       (the data survived the write and is returned on a fresh read).

    4. report("KEPUTUSAN_ARMADA_ETA_ROUNDTRIP_OK", ...) with the boolean of
       all three checks, and include its result in the final aggregate
       KEPUTUSAN_ROUTES_OK report's AND-chain.

    5. DELETE /keputusan/{armadaId} with the manajer token to self-clean, and
       null out armadaId. Also extend the finally-block best-effort cleanup to
       DELETE armadaId if still set (mirror the existing createdId cleanup).

    Keep all new code consistent with the file's existing helpers (login,
    report, fetch-with-Bearer pattern) — do not introduce new dependencies.
  </action>
  <verify>
    <automated>cd server && node src/routes/keputusanRoutes.verify.mjs | tee /tmp/verify_out.txt | grep -q 'KEPUTUSAN_ARMADA_ETA_ROUNDTRIP_OK true' && grep -q 'KEPUTUSAN_ROUTES_OK true' /tmp/verify_out.txt && echo VERIFY_OK</automated>
  </verify>
  <done>The verify script prints KEPUTUSAN_ARMADA_ETA_ROUNDTRIP_OK true and the overall KEPUTUSAN_ROUTES_OK true; the temp decision is self-cleaned; no leftover __ArmadaEtaVerifyTemp__ row remains.</done>
</task>

</tasks>

<verification>
- `npx prisma migrate dev` applied cleanly to switera-db-1 with no data-loss warning; new migration directory present.
- Prisma Client regenerated and picks up armada/eta.
- `node src/routes/keputusanRoutes.verify.mjs` exits 0 with KEPUTUSAN_ROUTES_OK true, including the new KEPUTUSAN_ARMADA_ETA_ROUNDTRIP_OK true line.
- No frontend files (src/**) modified — backend-only change.
</verification>

<success_criteria>
- armada and eta are nullable String columns on both Keputusan and RiwayatKeputusan.
- A PUT /keputusan/:id carrying armada+eta persists both, and a subsequent GET returns them (round-trip proven by the verify script).
- Create path and existing race/RBAC/validation assertions remain green.
- Change is confined to server/ — frontend untouched.
</success_criteria>

<output>
Create `.planning/quick/260625-cvb-tambahkan-kolom-armada-dan-eta-ke-model-/260625-cvb-SUMMARY.md` when done.
</output>
