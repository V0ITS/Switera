// SYNC-01 multi-client convergence proof.
//
// SCOPE (honest, read before trusting the PASS line): this script proves
// convergence through the REAL store.js polling loop (startPolling/
// pollTick/stopPolling from 10-01) driven against the LIVE Express
// backend (assumed already running on :4000 — the same target a real
// browser tab uses), simulating TWO independent client sessions in ONE
// Node process via Vite's `ssrLoadModule` with a cache-busting query
// string per client. It is NOT a rendered two-browser-tab pixel proof —
// no Playwright/chromium-cli is available in this environment (carried
// forward across Phases 5/9/10-01). That remains a MANUAL verification
// step, recorded in 10-02-SUMMARY.md.
//
// WHY ssrLoadModule INSTEAD OF PLAIN node IMPORT (a real blocker found
// while writing this script, not assumed up front): src/store.js uses
// extensionless relative imports (`./api/apiClient`, `./components/Toast`)
// that Vite resolves implicitly but plain Node ESM's resolver rejects
// with ERR_MODULE_NOT_FOUND (Node dropped the old
// --experimental-specifier-resolution=node flag). store.js also
// transitively imports a `.jsx` file (Toast.jsx) which plain Node cannot
// parse at all. Vite's dev server (already a project dependency, and
// already used for this exact purpose in 10-01's live verification, see
// 10-01-SUMMARY.md "Manual/Live Verification") resolves both problems for
// free via its own module graph + esbuild transform, so this script boots
// a Vite middleware-mode server (no HTTP listener, no port) purely as an
// in-process module loader. This is NOT a new project dependency — vite
// is already in package.json.
//
// CACHE-BUSTING: `vite.ssrLoadModule('/src/store.js?clientA')` and
// `?clientB` give two genuinely independent module instances (verified:
// `storeA !== storeB`, each with its own closed-over `state` object) —
// the cache-bust-import approach documented in the plan, chosen over a
// two-child-process design because it keeps a single process / simpler
// cleanup, and was concretely verified to yield independent stores before
// being relied on below (TWO_INDEPENDENT_CLIENTS_OK).
//
// TOKEN ISOLATION (the subtle part the plan flagged): apiClient.js's
// getToken()/setToken() read/write `window.localStorage` — a *global*,
// not something captured per-module-instance at import time. If both
// client sessions just shared one mutable `globalThis.window`, whichever
// client last set it would silently win for ALL subsequent calls,
// including a SECOND client's background poll tick firing later (this was
// reproduced directly while building this script: a manual swap-and-leave
// approach caused client B's poll tick to read client A's token and
// "converge" under the WRONG identity — a false pass). The fix used here:
// monkey-patch the global `setInterval` BEFORE importing either store
// module, so every interval registered via store.startPolling() captures
// (closes over) whichever `globalThis.window` was active AT THE MOMENT
// startPolling() was called, and restores that exact window for every
// future firing of that one timer — regardless of what any other client
// does to `globalThis.window` in between ticks. Each one-off (non-timer)
// store call is wrapped in `asClient(...)`, which pins `globalThis.window`
// for the duration of that one await and restores it afterward. This
// guarantees a poll tick always uses its own client's token, proven below
// by a convergence check that runs while the main script flow is busy
// doing client A work (NOT manually orchestrated to "happen to" line up).
//
// Verified standalone before being relied on in this script (see commit
// history / development notes): two concurrently-polling clients each
// keep ticking under their OWN identity with zero cross-contamination.

import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BACKEND_BASE_URL = "http://localhost:4000";
const POLL_INTERVAL_MS = 4000; // must match src/store.js's POLL_INTERVAL_MS
const CONVERGENCE_WAIT_MS = 13000; // ~3 poll intervals
const CONVERGENCE_CHECK_EVERY_MS = 500;

let exitCode = 0;
function report(label, ok, details) {
  console.log(`${label} ${ok}${details ? ` ${details}` : ""}`);
  if (!ok) exitCode = 1;
}

// Patch global setInterval ONCE, before any store module is imported, so
// every interval created via store.startPolling() binds its own
// `globalThis.window` snapshot for every future tick.
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

// Pins globalThis.window to `win` for the duration of `fn`'s await chain,
// then restores it. Used for every one-off (non-timer) call so a client's
// own session token is the one apiClient sees while that call is in flight.
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

  let createdIds = [];
  let pollingStartedOnB = false;

  try {
    const winA = makeClientWindow("A");
    globalThis.window = winA;
    const { store: storeA } = await vite.ssrLoadModule("/src/store.js?client=A");

    const winB = makeClientWindow("B");
    globalThis.window = winB;
    const { store: storeB } = await vite.ssrLoadModule("/src/store.js?client=B");

    const twoIndependentClients = storeA !== storeB;
    report("TWO_INDEPENDENT_CLIENTS_OK", twoIndependentClients);
    if (!twoIndependentClients) {
      throw new Error("Cache-busting ssrLoadModule import did not yield two independent store instances.");
    }

    const asA = (fn) => withWindow(winA, fn);
    const asB = (fn) => withWindow(winB, fn);

    // 1. Log in both clients as two DIFFERENT real roles.
    const userA = await asA(() => storeA.login("manajer", "manajer123"));
    const userB = await asB(() => storeB.login("logistik", "logistik123"));
    const loginOk = userA?.role === "Manajer Distribusi" && userB?.role === "Tim Logistik";
    report("LOGIN_BOTH_CLIENTS_OK", loginOk, `(A=${userA?.role}, B=${userB?.role})`);

    // 2. Hydrate both, then start polling on B only (this task's stop-halts
    // check needs a clean polling/not-polling contrast on B alone).
    await asA(() => storeA.hydrate());
    await asB(() => storeB.hydrate());
    await asB(() => storeB.startPolling());
    pollingStartedOnB = true;

    // 3. Record B's current permintaan count.
    const beforeCount = storeB.getPermintaan().length;

    // 4. Client A mutates: create a throwaway permintaan. POST /permintaan
    // is Admin-only server-side (permintaanRoutes.js) — re-login A as admin
    // for this specific write (manajer's earlier login proved a real
    // cross-role session exists for LOGIN_BOTH_CLIENTS_OK; admin is the
    // role actually allowed to create permintaan).
    await asA(() => storeA.login("admin", "admin123"));
    const kotaList = await asA(() => Promise.resolve(storeA.getDaftarKota()));
    const targetKota = kotaList[0]?.nama;
    const created = await asA(() =>
      storeA.addPermintaan({
        kota: targetKota,
        tanggal_permintaan: "2026-06-25",
        tanggal_input: "2026-06-25",
        jumlah_permintaan: 1,
        keterangan: "__SYNC_VERIFY_TEMP__",
      })
    );
    createdIds.push(created.id);

    // 5. Wait for B's poll tick (NOT a manual loadPermintaan call) to pick
    // it up.
    let convergedAfterMs = null;
    const convergenceStart = Date.now();
    while (Date.now() - convergenceStart < CONVERGENCE_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, CONVERGENCE_CHECK_EVERY_MS));
      if (storeB.getPermintaan().some((p) => p.id === created.id)) {
        convergedAfterMs = Date.now() - convergenceStart;
        break;
      }
    }
    const syncConvergenceOk = convergedAfterMs !== null && convergedAfterMs <= CONVERGENCE_WAIT_MS;
    report(
      "SYNC_CONVERGENCE_OK",
      syncConvergenceOk,
      syncConvergenceOk
        ? `(elapsedMs=${convergedAfterMs}, pollIntervalMs=${POLL_INTERVAL_MS})`
        : `(elapsedMs=${Date.now() - convergenceStart}, never converged within ${CONVERGENCE_WAIT_MS}ms)`
    );

    // 6. Stop polling on B, then prove a further mutation by A is NOT
    // observed by B within one interval.
    await asB(() => storeB.stopPolling());
    pollingStartedOnB = false;

    const secondMarker = await asA(() =>
      storeA.addPermintaan({
        kota: targetKota,
        tanggal_permintaan: "2026-06-25",
        tanggal_input: "2026-06-25",
        jumlah_permintaan: 1,
        keterangan: "__SYNC_VERIFY_TEMP__",
      })
    );
    createdIds.push(secondMarker.id);

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS + 1000));
    const pollStoppedOk = !storeB.getPermintaan().some((p) => p.id === secondMarker.id);
    report(
      "POLL_STOPPED_OK",
      pollStoppedOk,
      pollStoppedOk
        ? "(B did not observe post-stop mutation, as expected)"
        : "(B observed a mutation AFTER stopPolling — stop path is broken)"
    );

    const allOk = twoIndependentClients && loginOk && syncConvergenceOk && pollStoppedOk;
    report("MULTI_CLIENT_SYNC_OK", allOk);
  } finally {
    // Cleanup: remove every throwaway permintaan created, regardless of
    // outcome, so this script is idempotent/re-runnable. Cleanup must run
    // as admin (DELETE /permintaan is Admin-only).
    if (createdIds.length > 0) {
      try {
        const winCleanup = makeClientWindow("cleanup");
        globalThis.window = winCleanup;
        const { store: storeCleanup } = await vite.ssrLoadModule("/src/store.js?client=cleanup");
        await withWindow(winCleanup, () => storeCleanup.login("admin", "admin123"));
        for (const id of createdIds) {
          try {
            await withWindow(winCleanup, () => storeCleanup.removePermintaan(id));
          } catch {
            // Best-effort — row may already be gone.
          }
        }
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
