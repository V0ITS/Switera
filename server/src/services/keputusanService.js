import prisma from "../db/prismaClient.js";

/**
 * Maps a status value to its corresponding "waktu*" DateTime column name on
 * both the Keputusan and RiwayatKeputusan tables (waktuMenunggu,
 * waktuDalamPengiriman, waktuSelesai, waktuDibatalkan). Mirrors
 * src/store.js's template-literal convention (`waktu_${status}`) but with
 * the snake_case status converted to the schema's camelCase column name.
 */
const WAKTU_FIELD_BY_STATUS = {
  menunggu: "waktuMenunggu",
  "dalam-pengiriman": "waktuDalamPengiriman",
  selesai: "waktuSelesai",
  dibatalkan: "waktuDibatalkan",
};

/**
 * Maps a Prisma Keputusan/RiwayatKeputusan row (camelCase) to the
 * src/store.js snake_case API shape the frontend expects: { id,
 * kota_tujuan, volume_tbs, tanggal_keputusan, diputuskan_oleh, status,
 * waktu_menunggu, waktu_dalam_pengiriman, waktu_selesai, waktu_dibatalkan }.
 */
function toApi(row) {
  return {
    id: row.id,
    kota_tujuan: row.kotaTujuanNama,
    volume_tbs: row.volumeTbs,
    tanggal_keputusan: row.tanggalKeputusan,
    diputuskan_oleh: row.diputuskanOleh,
    status: row.status,
    waktu_menunggu: row.waktuMenunggu,
    waktu_dalam_pengiriman: row.waktuDalamPengiriman,
    waktu_selesai: row.waktuSelesai,
    waktu_dibatalkan: row.waktuDibatalkan,
  };
}

/**
 * Maps a snake_case entry (or partial update) to Prisma camelCase data.
 * Only includes keys actually present on `entry` (via hasOwnProperty) so
 * partial updates (updateKeputusan) merge correctly instead of overwriting
 * untouched fields with undefined. The four waktu_* fields pass through
 * as-is (null/undefined for absent ones) — callers that need to SET a
 * waktu_* timestamp do so explicitly outside toDb (see addKeputusan /
 * updateKeputusan below), never by guessing it from entry.
 */
function toDb(entry) {
  const data = {};

  if (Object.prototype.hasOwnProperty.call(entry, "kota_tujuan")) {
    data.kotaTujuanNama = entry.kota_tujuan;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "volume_tbs")) {
    data.volumeTbs = Number(entry.volume_tbs);
  }
  if (Object.prototype.hasOwnProperty.call(entry, "tanggal_keputusan")) {
    data.tanggalKeputusan = entry.tanggal_keputusan;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "diputuskan_oleh")) {
    data.diputuskanOleh = entry.diputuskan_oleh;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "status")) {
    data.status = entry.status;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "waktu_menunggu")) {
    data.waktuMenunggu = entry.waktu_menunggu ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "waktu_dalam_pengiriman")) {
    data.waktuDalamPengiriman = entry.waktu_dalam_pengiriman ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "waktu_selesai")) {
    data.waktuSelesai = entry.waktu_selesai ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "waktu_dibatalkan")) {
    data.waktuDibatalkan = entry.waktu_dibatalkan ?? null;
  }

  return data;
}

/**
 * Returns every live Keputusan row in the src/store.js snake_case shape.
 */
export async function getKeputusan() {
  const rows = await prisma.keputusan.findMany();
  return rows.map(toApi);
}

/**
 * Returns every RiwayatKeputusan (decision history) row in the
 * src/store.js snake_case shape.
 */
export async function getRiwayatKeputusan() {
  const rows = await prisma.riwayatKeputusan.findMany();
  return rows.map(toApi);
}

/**
 * Generates the next KPT-### id, replicating src/store.js's getNextId
 * exactly: read from RiwayatKeputusan (matches state.riwayatKeputusan),
 * find the max numeric suffix, add 1, zero-padded to 3 digits, skip
 * forward past any collision.
 */
async function getNextKeputusanId() {
  const rows = await prisma.riwayatKeputusan.findMany({ select: { id: true } });
  const existingIds = new Set(rows.map((row) => String(row.id)));

  let nextNumber =
    rows.reduce((maxValue, row) => {
      const numericId = Number(String(row.id).replace(/\D/g, ""));
      return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
    }, 0) + 1;

  let candidate = `KPT-${String(nextNumber).padStart(3, "0")}`;
  while (existingIds.has(candidate)) {
    nextNumber += 1;
    candidate = `KPT-${String(nextNumber).padStart(3, "0")}`;
  }

  return candidate;
}

/**
 * Creates a new Keputusan row. Generates a KPT-### id when entry.id is
 * absent, defaults status to "menunggu", sets the matching waktu_* field to
 * now, and writes to BOTH the Keputusan and RiwayatKeputusan tables inside
 * one transaction (mirrors src/store.js's addKeputusan dual-write and
 * seed.js's seedKeputusanAndRiwayat comment: "store.js seeds BOTH
 * state.keputusan and state.riwayatKeputusan").
 *
 * NOTE: src/store.js's addKeputusan also pushes a notification + an
 * activity-log entry. Those server-side side effects (LOGIC-03) are
 * deferred to 08-05, which extends this function's mutation with that
 * behavior. This is pure CRUD only.
 */
export async function addKeputusan(entry) {
  const id = entry.id ?? (await getNextKeputusanId());
  const status = entry.status ?? "menunggu";
  const waktuField = WAKTU_FIELD_BY_STATUS[status];

  const baseData = {
    ...toDb(entry),
    status,
    ...(waktuField ? { [waktuField]: new Date() } : {}),
  };

  const [created] = await prisma.$transaction([
    prisma.keputusan.create({ data: { id, ...baseData } }),
    prisma.riwayatKeputusan.create({ data: { id, ...baseData } }),
  ]);

  return toApi(created);
}

/**
 * Partially updates a Keputusan row — THE RACE-SAFE PATH (closes LOGIC-02).
 *
 * src/store.js's updateKeputusan is a check-then-act flow with zero
 * concurrency guard: it reads existing.status, decides whether the status
 * changed, then unconditionally overwrites the row. Two concurrent
 * approval requests for the same decision can both read the pre-change
 * status and both believe they are the one transitioning it.
 *
 * The fix: make the UPDATE itself the lock. Step 4 below is a single
 * atomic SQL `UPDATE ... WHERE id = ? AND status = ?` statement —
 * PostgreSQL guarantees only one of two concurrent identical statements
 * can match and update the row; the loser's result.count is 0. This is
 * the binding LOGIC-02 mechanism (optimistic locking via conditional
 * updateMany), not a unique constraint or a $transaction with row
 * locking — see 08-04-PLAN.md objective for the full rationale.
 *
 * SUBTLE CASE (fixed after live-HTTP testing surfaced it under real
 * concurrent load): when two concurrent requests target the SAME
 * destination status (e.g. both PUT { status: "dalam-pengiriman" } while
 * the row is "menunggu"), a naive `WHERE status: existing.status` guard is
 * insufficient. If request A commits first (menunggu -> dalam-pengiriman)
 * and request B's own read then observes the row AFTER A's commit, B's
 * `existing.status` is ALREADY "dalam-pengiriman" — the value B itself
 * intends to write. B's updateMany becomes a true no-op
 * (`WHERE status='dalam-pengiriman' SET status='dalam-pengiriman'`) that
 * still matches and reports count=1, silently treating a lost race as a
 * second success. The fix: a write only counts as a legitimate winning
 * transition when the read-time status actually differs from the target
 * status (statusBerubah). If it does not differ, the request is either a
 * true no-op update (no status key supplied) — allowed — or it is a
 * status-change request arriving after the transition already happened —
 * rejected as a 409 conflict, exactly as if it had lost the updateMany race.
 */
export async function updateKeputusan(id, updates) {
  // Step 1: read the current row ONCE.
  const existing = await prisma.keputusan.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error("Keputusan tidak ditemukan."), { statusCode: 404 });
  }

  const statusRequested = Object.prototype.hasOwnProperty.call(updates, "status");

  // Step 2: determine whether this update changes status (mirrors
  // src/store.js's exact condition).
  const statusBerubah = statusRequested && existing.status !== updates.status;

  // A status-change request whose target status already matches the
  // row's current status is NOT a legitimate transition to apply — it is
  // either a redundant no-op the caller should not treat as a fresh
  // success, or (the concurrent case above) a loser of the race that read
  // the post-commit state. Reject it as a conflict rather than silently
  // reporting success, so the route layer's 409 mapping is the one
  // observable outcome for "someone already made this exact change."
  if (statusRequested && !statusBerubah) {
    throw Object.assign(
      new Error("Status keputusan sudah diperbarui oleh proses lain. Muat ulang data dan coba lagi."),
      { statusCode: 409 }
    );
  }

  // Step 3: build the partial update payload, adding the matching waktu_*
  // timestamp only when the status is actually transitioning.
  const data = toDb(updates);
  if (statusBerubah) {
    const waktuField = WAKTU_FIELD_BY_STATUS[updates.status];
    if (waktuField) {
      data[waktuField] = new Date();
    }
  }

  // Step 4: THE LOCK-ACQUIRING WRITE. The `status: existing.status` guard
  // in the WHERE clause means this UPDATE only succeeds if the row's
  // status is STILL what we just read it as. If a concurrent request
  // already changed it, result.count is 0 — we lost the race.
  const result = await prisma.keputusan.updateMany({
    where: { id, status: existing.status },
    data,
  });

  // Step 5: the loser gets a 409 conflict. No automatic retry — surface
  // the conflict to the caller (route layer maps this to an HTTP 409).
  if (result.count === 0) {
    throw Object.assign(
      new Error("Status keputusan sudah diperbarui oleh proses lain. Muat ulang data dan coba lagi."),
      { statusCode: 409 }
    );
  }

  // Step 6: only the winner reaches here. RiwayatKeputusan has no
  // concurrent-writer race (only the live Keputusan row is contested), so
  // it is updated after the optimistic-lock write commits, staying
  // consistent with whichever request won. This does NOT need to be in
  // the same transaction as step 4 — step 4 alone is the atomicity
  // boundary; step 6 only ever runs for the confirmed winner.
  await prisma.riwayatKeputusan.update({ where: { id }, data });

  const updated = await prisma.keputusan.findUnique({ where: { id } });

  // Step 7: return existing.status/statusBerubah so the route layer (and
  // 08-05's LOGIC-03 wrapper) can decide whether to fire side effects
  // without re-reading the row.
  return { updated: toApi(updated), statusBerubah, existingStatus: existing.status };
}

/**
 * Cancels a decision: marks the RiwayatKeputusan row "dibatalkan" with
 * waktuDibatalkan set, then deletes the live Keputusan row (mirrors
 * src/store.js's removeKeputusan — NOT a soft delete on the live table,
 * only on the historical one).
 */
export async function removeKeputusan(id) {
  const existing = await prisma.keputusan.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error("Keputusan tidak ditemukan."), { statusCode: 404 });
  }

  await prisma.$transaction([
    prisma.riwayatKeputusan.update({
      where: { id },
      data: { status: "dibatalkan", waktuDibatalkan: new Date() },
    }),
    prisma.keputusan.delete({ where: { id } }),
  ]);

  return toApi(existing);
}

/**
 * Restores a previously cancelled/removed decision: re-creates the live
 * Keputusan row and overwrites the matching RiwayatKeputusan row with the
 * restored item (mirrors src/store.js's restoreKeputusan exactly).
 */
export async function restoreKeputusan(item) {
  const data = toDb(item);

  const [created] = await prisma.$transaction([
    prisma.keputusan.create({ data: { id: item.id, ...data } }),
    prisma.riwayatKeputusan.update({ where: { id: item.id }, data }),
  ]);

  return toApi(created);
}
