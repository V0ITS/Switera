// Multi-client RBAC re-verification under active polling (Phase 10
// Success Criterion 3). Re-proves the Phase 7/8 POST /keputusan 403
// denial for Tim Logistik still holds when BOTH client sessions are
// actively polling (10-01's startPolling/pollTick) — confirming polling
// introduced no new route and relaxed no requireRole check. The original
// Phase 7 rbac.verify.mjs no longer exists (deleted in 08-06 alongside the
// retired /protected demo router); keputusanRoutes.verify.mjs is today's
// single-client equivalent for the SAME 403 check, but without polling
// load — this script's new assurance is specifically "...and it still
// holds while polling is running on concurrent sessions."
//
// Bootstrap conventions are copied from multiClientSync.verify.mjs (this
// plan's Task 1) rather than factored into a shared helper module, per the
// plan's own one-file-per-verify convention precedent
// (keputusanRoutes.verify.mjs / keputusanService.race.verify.mjs each
// stand alone): Vite ssrLoadModule + cache-busted query string for two
// independent store.js instances (plain Node ESM cannot resolve
// store.js's extensionless imports / its transitive Toast.jsx import); a
// global setInterval monkey-patch that binds each poll timer to the
// window/token active at startPolling() call time, so two concurrently
// polling clients never cross-contaminate tokens on a background tick;
// withWindow(win, fn) pins globalThis.window for the duration of any
// one-off (non-timer) call. See Task 1's file for the full isolation
// rationale and the concrete cross-contamination bug it was written to
// avoid.

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

    // 1. Client A: Admin. Client B: Tim Logistik (the disallowed role for
    // POST /keputusan).
    const userA = await asA(() => storeA.login("admin", "admin123"));
    const userB = await asB(() => storeB.login("logistik", "logistik123"));
    const loginOk = userA?.role === "Admin" && userB?.role === "Tim Logistik";
    report("RBAC_LOGIN_OK", loginOk, `(A=${userA?.role}, B=${userB?.role})`);

    await asA(() => storeA.hydrate());
    await asB(() => storeB.hydrate());

    // 2. Start polling on BOTH clients before attempting the disallowed
    // mutation, so the denial is exercised under live polling load.
    await asA(() => storeA.startPolling());
    await asB(() => storeB.startPolling());

    const kotaList = await asA(() => Promise.resolve(storeA.getDaftarKota()));
    const targetKota = kotaList[0]?.nama;

    // 3. Client B (Tim Logistik) attempts a disallowed POST /keputusan.
    // Must reject with 403.
    let denyError = null;
    try {
      await asB(() =>
        storeB.addKeputusan({
          kota_tujuan: targetKota,
          volume_tbs: 10,
          tanggal_keputusan: "2026-06-25",
          diputuskan_oleh: "logistik",
          status: "menunggu",
        })
      );
    } catch (error) {
      denyError = error;
    }
    const rbacPollingDenyOk = denyError?.status === 403;
    report(
      "RBAC_POLLING_DENY_OK",
      rbacPollingDenyOk,
      rbacPollingDenyOk
        ? ""
        : `(status=${denyError?.status}, message=${denyError?.message ?? "no error thrown — mutation unexpectedly succeeded"})`
    );

    // 4. Positive control: same mutation via Admin must succeed.
    let allowedRow = null;
    let allowError = null;
    try {
      allowedRow = await asA(() =>
        storeA.addKeputusan({
          kota_tujuan: targetKota,
          volume_tbs: 10,
          tanggal_keputusan: "2026-06-25",
          diputuskan_oleh: "__MultiClientRbacVerifyTemp__",
          status: "menunggu",
        })
      );
    } catch (error) {
      allowError = error;
    }
    const rbacPollingAllowOk =
      !allowError && typeof allowedRow?.id === "string" && allowedRow.id.startsWith("KPT-");
    report(
      "RBAC_POLLING_ALLOW_OK",
      rbacPollingAllowOk,
      rbacPollingAllowOk ? `(id=${allowedRow.id})` : `(error=${allowError?.message})`
    );
    if (allowedRow?.id) {
      createdKeputusanId = allowedRow.id;
    }

    const allOk = loginOk && rbacPollingDenyOk && rbacPollingAllowOk;
    report("MULTI_CLIENT_RBAC_OK", allOk);

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
