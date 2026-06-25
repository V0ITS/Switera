// Multi-client LOGIC-02 race re-verification under active polling (Phase
// 10 Success Criterion 4). Re-proves the Phase 8 exactly-one-winner
// concurrent-approval guarantee (optimistic-lock updateMany in
// keputusanService.js) holds when the race is driven through TWO real
// logged-in client store.js sessions — not direct curl/fetch
// (keputusanRoutes.verify.mjs's KEPUTUSAN_PUT_RACE_OK) and not the bare
// service layer (keputusanService.race.verify.mjs) — with polling active
// on both sessions. The new assurance over those two existing scripts:
// the FULL client stack (store.js -> apiClient.js -> backend), with
// polling running, still yields exactly one winner.
//
// Bootstrap conventions copied from Task 1/2 (this plan's
// multiClientSync.verify.mjs / multiClientRbac.verify.mjs) per the
// established one-file-per-verify convention: Vite ssrLoadModule +
// cache-busted query string for two independent store.js instances; a
// global setInterval monkey-patch binding each poll timer to the window/
// token active at startPolling() call time; withWindow(win, fn) pinning
// globalThis.window for one-off calls. See Task 1's file for the full
// isolation rationale.

import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BACKEND_BASE_URL = "http://localhost:4000";

let exitCode = 0;
function report(label, ok, details) {
  console.log(`${label} ${ok}${details ? ` ${details}` : ""}`);
  if (!ok) exitCode = 1;
}

const realSetInterval = globalThis.setInterval;
function installIntervalWindowBinding() {
  globalThis.setInterval = function boundSetInterval(fn, ms, ...rest) {
    const boundWindow = globalThis.window;
    return realSetInterval(() => {
      const prevWindow = globalThis.window;
      globalThis.window = boundWindow;
      try {
        return fn();
      } finally {
        globalThis.window = prevWindow;
      }
    }, ms, ...rest);
  };
}

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function makeClientWindow(label) {
  return {
    __label: label,
    localStorage: makeLocalStorage(),
    matchMedia: () => ({ matches: false }),
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearTimeout: (...args) => globalThis.clearTimeout(...args),
  };
}

async function withWindow(win, fn) {
  const prev = globalThis.window;
  globalThis.window = win;
  try {
    return await fn();
  } finally {
    globalThis.window = prev;
  }
}

async function preflightHealthCheck() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const healthy = await preflightHealthCheck();
  if (!healthy) {
    console.error(
      `PREFLIGHT_FAILED: ${BACKEND_BASE_URL}/health is not reachable. Start the Express backend (server/) before running this script.`
    );
    process.exitCode = 1;
    return;
  }

  installIntervalWindowBinding();

  const vite = await createServer({
    root: PROJECT_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });

  let createdKeputusanId = null;

  try {
    const winA = makeClientWindow("A");
    globalThis.window = winA;
    const { store: storeA } = await vite.ssrLoadModule("/src/store.js?client=A");

    const winB = makeClientWindow("B");
    globalThis.window = winB;
    const { store: storeB } = await vite.ssrLoadModule("/src/store.js?client=B");

    const asA = (fn) => withWindow(winA, fn);
    const asB = (fn) => withWindow(winB, fn);

    // 1. Both clients are allow-listed on PUT /keputusan (Admin, Manajer
    // Distribusi, Tim Logistik).
    const userA = await asA(() => storeA.login("manajer", "manajer123"));
    const userB = await asB(() => storeB.login("logistik", "logistik123"));
    const loginOk = userA?.role === "Manajer Distribusi" && userB?.role === "Tim Logistik";
    report("RACE_LOGIN_OK", loginOk, `(A=${userA?.role}, B=${userB?.role})`);

    await asA(() => storeA.hydrate());
    await asB(() => storeB.hydrate());

    // 2. Start polling on both clients so the race is exercised under live
    // polling load.
    await asA(() => storeA.startPolling());
    await asB(() => storeB.startPolling());

    // 3. Client A creates one throwaway "menunggu" keputusan. POST
    // /keputusan is Admin/Manajer Distribusi only — manajer (A) is allowed.
    const kotaList = await asA(() => Promise.resolve(storeA.getDaftarKota()));
    const targetKota = kotaList[0]?.nama;
    const created = await asA(() =>
      storeA.addKeputusan({
        kota_tujuan: targetKota,
        volume_tbs: 10,
        tanggal_keputusan: "2026-06-25",
        diputuskan_oleh: "__RACE_VERIFY_TEMP__",
        status: "menunggu",
      })
    );
    createdKeputusanId = created.id;
    const setupOk = typeof created.id === "string" && created.id.startsWith("KPT-") && created.status === "menunggu";
    report("RACE_SETUP_OK", setupOk, setupOk ? `(id=${created.id})` : `(body=${JSON.stringify(created)})`);

    // 4. Fire TWO genuinely concurrent status transitions to the SAME
    // target status from the two different client sessions, through the
    // real client stack (store.js -> apiClient.js -> live PUT route).
    const [resultA, resultB] = await Promise.allSettled([
      asA(() => storeA.updateKeputusan(created.id, { status: "dalam-pengiriman" })),
      asB(() => storeB.updateKeputusan(created.id, { status: "dalam-pengiriman" })),
    ]);

    const fulfilled = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const rejected = [resultA, resultB].filter((r) => r.status === "rejected");
    const exactlyOneWinner = fulfilled.length === 1 && rejected.length === 1;
    report(
      "RACE_EXACTLY_ONE_WINNER_OK",
      exactlyOneWinner,
      `(fulfilled=${fulfilled.length}, rejected=${rejected.length})`
    );

    const rejectedError = rejected[0]?.reason;
    const conflictShapeOk =
      exactlyOneWinner &&
      rejectedError?.status === 409 &&
      typeof rejectedError?.message === "string" &&
      rejectedError.message.includes("sudah diperbarui");
    report(
      "RACE_CONFLICT_SHAPE_OK",
      conflictShapeOk,
      conflictShapeOk
        ? ""
        : `(status=${rejectedError?.status}, message=${JSON.stringify(rejectedError?.message)})`
    );

    // 5. Confirm post-race server truth: the row's status is
    // "dalam-pengiriman" exactly once / not double-applied.
    await asA(() => storeA.loadKeputusan());
    const finalRow = storeA.getKeputusan().find((item) => item.id === created.id);
    const finalStateOk = finalRow?.status === "dalam-pengiriman";
    report(
      "RACE_FINAL_STATE_OK",
      finalStateOk,
      finalStateOk ? "" : `(row=${JSON.stringify(finalRow)})`
    );

    const allOk = loginOk && setupOk && exactlyOneWinner && conflictShapeOk && finalStateOk;
    report("MULTI_CLIENT_RACE_OK", allOk);

    await asA(() => storeA.stopPolling());
    await asB(() => storeB.stopPolling());
  } finally {
    if (createdKeputusanId) {
      try {
        const winCleanup = makeClientWindow("cleanup");
        globalThis.window = winCleanup;
        const { store: storeCleanup } = await vite.ssrLoadModule("/src/store.js?client=cleanup");
        await withWindow(winCleanup, () => storeCleanup.login("admin", "admin123"));
        await withWindow(winCleanup, () => storeCleanup.removeKeputusan(createdKeputusanId));
        await withWindow(winCleanup, () => storeCleanup.stopPolling());
      } catch {
        // Best-effort cleanup — ignore.
      }
    }
    await vite.close();
  }

  process.exitCode = exitCode;
}

main();
