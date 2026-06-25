import {
  apiFetch,
  getToken,
  setToken,
  clearToken,
  setUnauthorizedHandler,
  subscribeLoading,
  isLoading,
} from "./api/apiClient";
import { showToast } from "./components/Toast";

const roleSeed = "Admin";
const statusLabelMap = {
  menunggu: "Menunggu",
  "dalam-pengiriman": "Dalam Pengiriman",
  selesai: "Selesai",
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizePermintaanEntry = (entry) => ({
  ...entry,
  tanggal_permintaan: entry.tanggal_permintaan ?? entry.tanggal_input ?? "",
  tanggal_input: entry.tanggal_input ?? entry.tanggal_permintaan ?? "",
});
const normalizePermintaanList = (items) => items.map(normalizePermintaanEntry);
const getNextId = (items, prefix) => {
  const existingIds = new Set(items.map((item) => String(item.id)));
  let nextNumber =
    items.reduce((maxValue, item) => {
      const numericId = Number(String(item.id).replace(/\D/g, ""));
      return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
    }, 0) + 1;

  let candidate = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  while (existingIds.has(candidate)) {
    nextNumber += 1;
    candidate = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  }

  return candidate;
};

// switera_session_v2 replaces the old switera_state_v1 domain blob: the
// server is now the source of truth for all DOMAIN collections (Phase 9
// hydrated in-memory cache decision). Only the session (active user) and
// the tema UI preference — never a backend concern — are persisted here.
const SESSION_STORAGE_KEY = "switera_session_v2";

const loadPersistedSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistedSession = loadPersistedSession();

const getSystemPreferredTema = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
};

const state = {
  userAktif: persistedSession?.userAktif ?? null,
  roleAktif: persistedSession?.userAktif?.role ?? roleSeed,
  tema: persistedSession?.tema ?? getSystemPreferredTema(),
  isLoading: false,
  lastError: null,
  // DOMAIN collections are no longer seeded client-side — the server is the
  // source of truth. They start empty and are filled by store.hydrate()
  // (introduced here, fully wired in 09-05) and by each domain's own
  // mutators (09-02..09-05) writing the server's authoritative response.
  daftarKota: [],
  stokTbs: 0,
  permintaan: [],
  keputusan: [],
  riwayatKeputusan: [],
  notifikasi: [],
  activityLog: [],
};

const persistState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userAktif: state.userAktif, tema: state.tema })
    );
  } catch {
    // localStorage unavailable (private mode/quota) — continue without persistence
  }
};

const listeners = new Set();

const notify = () => {
  persistState();
  const snapshot = store.getState();
  listeners.forEach((listener) => listener(snapshot));
};

// Any in-flight apiFetch call updates the exposed isLoading boolean through
// the EXISTING subscribe/notify contract — no new wiring required on any
// page (FE-02 loading/error UX decision).
subscribeLoading(() => {
  state.isLoading = isLoading();
  notify();
});

// A 401 from ANY request clears the session and forces re-login. App.jsx's
// existing `!snapshot.userAktif` effect already redirects to /login — no
// App.jsx change needed (T-09-401).
setUnauthorizedHandler(() => {
  state.userAktif = null;
  try {
    window.localStorage.removeItem("switera_user");
  } catch {
    // localStorage unavailable (private mode/quota) — continue without persistence
  }
  clearToken();
  notify();
});

// Shared error-to-UX path for auth/domain mutators (FE-02): catches a
// thrown apiFetch error, records it on the cache, surfaces a Toast, then
// re-throws so the calling page's existing try/catch can still map
// field-level errors exactly as in v1.0.
const runMutation = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    state.lastError = error.message;
    showToast({ type: "error", message: error.message });
    notify();
    throw error;
  }
};

const updateCollection = (key, updater) => {
  const nextValue = updater(clone(state[key]));
  state[key] =
    key === "permintaan" ? normalizePermintaanList(nextValue) : nextValue;
  notify();
  return clone(state[key]);
};

const updateValue = (key, value) => {
  state[key] = value;
  notify();
  return clone(state[key]);
};

const pushNotifikasi = (notif) => {
  const notifikasiBaru = {
    id: notif.id ?? getNextId(state.notifikasi, "NTF"),
    judul: notif.judul,
    pesan: notif.pesan,
    tipe: notif.tipe ?? "info",
    dibaca: notif.dibaca ?? false,
    waktu: notif.waktu ?? new Date().toISOString(),
  };

  state.notifikasi = [notifikasiBaru, ...state.notifikasi];
  return notifikasiBaru;
};

const pushActivity = (aktor, role, aksi) => {
  const activityBaru = {
    id: getNextId(state.activityLog, "LOG"),
    aktor,
    role,
    aksi,
    waktu: new Date().toISOString(),
  };

  state.activityLog = [activityBaru, ...state.activityLog];
  return activityBaru;
};

const recordActivity = (aksi) => {
  const aktor = state.userAktif?.nama ?? "Tidak diketahui";
  const role = state.userAktif?.role ?? state.roleAktif;
  return pushActivity(aktor, role, aksi);
};

export const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState() {
    return clone(state);
  },

  getUserAktif() {
    return state.userAktif ? clone(state.userAktif) : null;
  },

  setUserAktif(user) {
    // Server-side login activity logging is the backend's job now
    // (Phase 8 LOGIC-03 scope is domain mutations, not auth) — no
    // client-side pushActivity here, to avoid fabricating a duplicate or
    // out-of-band activity-log entry.
    state.userAktif = user ? clone(user) : null;
    if (user?.role) {
      state.roleAktif = user.role;
    }
    notify();
    return store.getUserAktif();
  },

  async login(username, password) {
    return runMutation(async () => {
      const resp = await apiFetch("/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });
      setToken(resp.token);
      store.setUserAktif(resp.user);
      return store.getUserAktif();
    });
  },

  async register({ nama, username, password, role }) {
    return runMutation(async () => {
      const resp = await apiFetch("/auth/register", {
        method: "POST",
        body: { nama, username, password, role },
        auth: false,
      });
      return resp.user;
    });
  },

  // Deprecated: login now goes through store.login() against the real
  // server (Phase 9). cariAkun's plaintext in-memory match is gone — this
  // shim exists so any missed caller fails loudly instead of silently
  // matching against an empty/stale client-side account list.
  cariAkun() {
    throw new Error(
      "store.cariAkun() tidak lagi tersedia — gunakan store.login(username, password)."
    );
  },

  // Deprecated: registration now goes through store.register() against the
  // real server, which also owns id generation. Kept as a loud shim so any
  // missed caller fails instead of silently no-op'ing.
  tambahAkun() {
    throw new Error(
      "store.tambahAkun() tidak lagi tersedia — gunakan store.register({ nama, username, password, role })."
    );
  },

  getNextAkunId() {
    throw new Error(
      "store.getNextAkunId() tidak lagi tersedia — id akun kini dibuat oleh server."
    );
  },

  logout() {
    clearToken();
    try {
      window.localStorage.removeItem("switera_user");
    } catch {
      // localStorage unavailable (private mode/quota) — continue without persistence
    }
    state.userAktif = null;
    notify();
    return store.getState();
  },

  // Bootstrap hydration entry point (introduced here, fully wired in
  // 09-05): once reads are synchronous against the cache, the cache must
  // be filled from the server before/at the moment an authenticated page
  // renders. 09-01 only introduces the symbol so App.jsx wiring + later
  // plans' collection fetches have a stable hook to extend; it
  // intentionally fetches nothing yet beyond what 09-02..09-05 add.
  async hydrate() {
    notify();
  },

  getPermintaan() {
    return clone(state.permintaan);
  },

  // Bootstrap loader (called on InputData/ManajemenData mount; 09-05 will
  // also call this from store.hydrate()).
  async loadPermintaan() {
    const resp = await apiFetch("/permintaan");
    state.permintaan = normalizePermintaanList(resp);
    notify();
    return clone(state.permintaan);
  },

  // SYNCHRONOUS cache reads (Phase 9 hydrated-cache pattern) — unchanged
  // signatures so ManajemenKota's snapshot.daftarKota / snapshot.stokTbs
  // reads keep working with zero page change. Populated by loadKota() /
  // loadStok() below and by each mutator's server response.
  getDaftarKota() {
    return clone(state.daftarKota);
  },

  getKapasitasKota(namaKota) {
    return state.daftarKota.find((kota) => kota.nama === namaKota)?.kapasitas ?? null;
  },

  // Bootstrap loaders (called on ManajemenKota mount; 09-05 will also call
  // these from store.hydrate()).
  async loadKota() {
    const resp = await apiFetch("/kota");
    state.daftarKota = resp;
    notify();
    return clone(state.daftarKota);
  },

  async loadStok() {
    const resp = await apiFetch("/stok-tbs");
    state.stokTbs = resp.stokTbs;
    notify();
    return state.stokTbs;
  },

  async getKotaReferenceCounts(nama) {
    return apiFetch(`/kota/${encodeURIComponent(nama)}/references`);
  },

  async tambahKota({ nama, kapasitas }) {
    return runMutation(async () => {
      const resp = await apiFetch("/kota", {
        method: "POST",
        body: { nama, kapasitas: Number(kapasitas) || 0 },
      });
      state.daftarKota = resp;
      notify();
      return clone(state.daftarKota);
    });
  },

  async updateKota(namaLama, { nama, kapasitas }) {
    return runMutation(async () => {
      const resp = await apiFetch(`/kota/${encodeURIComponent(namaLama)}`, {
        method: "PUT",
        body: { nama: nama.trim(), kapasitas: Number(kapasitas) || 0 },
      });
      state.daftarKota = resp;
      notify();
      return clone(state.daftarKota);
    });
  },

  async hapusKota(nama) {
    return runMutation(async () => {
      const resp = await apiFetch(`/kota/${encodeURIComponent(nama)}`, {
        method: "DELETE",
      });
      state.daftarKota = resp;
      notify();
      return clone(state.daftarKota);
    });
  },

  getStokTbs() {
    return state.stokTbs;
  },

  async setStokTbs(value) {
    return runMutation(async () => {
      const resp = await apiFetch("/stok-tbs", {
        method: "PUT",
        body: { stokTbs: Number(value) || 0 },
      });
      state.stokTbs = resp.stokTbs;
      notify();
      return state.stokTbs;
    });
  },

  getRoleAktif() {
    return state.roleAktif;
  },

  setRoleAktif(role) {
    return updateValue("roleAktif", role);
  },

  getTema() {
    return state.tema;
  },

  setTema(tema) {
    return updateValue("tema", tema);
  },

  toggleTema() {
    return updateValue("tema", state.tema === "dark" ? "light" : "dark");
  },

  async hasPermintaanDuplikat({ kota, tanggalPermintaan, excludeId }) {
    let qs = `?kota=${encodeURIComponent(kota)}&tanggal_permintaan=${encodeURIComponent(tanggalPermintaan)}`;
    if (excludeId) {
      qs += `&excludeId=${encodeURIComponent(excludeId)}`;
    }
    const resp = await apiFetch(`/permintaan/duplikat${qs}`);
    return resp.duplikat;
  },

  // Server owns the notification + anomaly-notification + activity-log side
  // effects for this mutation (permintaanService.addPermintaan, LOGIC-03) —
  // do NOT duplicate pushNotifikasi/recordActivity here.
  async addPermintaan(entry) {
    return runMutation(async () => {
      const resp = await apiFetch("/permintaan", {
        method: "POST",
        body: {
          kota: entry.kota,
          tanggal_permintaan: entry.tanggal_permintaan ?? entry.tanggal_input,
          tanggal_input: entry.tanggal_input ?? entry.tanggal_permintaan,
          jumlah_permintaan: Number(entry.jumlah_permintaan),
          keterangan: entry.keterangan,
        },
      });
      state.permintaan = normalizePermintaanList([...state.permintaan, resp]);
      notify();
      return clone(resp);
    });
  },

  async updatePermintaan(id, updates) {
    return runMutation(async () => {
      const resp = await apiFetch(`/permintaan/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: updates,
      });
      state.permintaan = normalizePermintaanList(
        state.permintaan.map((item) => (item.id === id ? resp : item))
      );
      notify();
      return clone(resp);
    });
  },

  async removePermintaan(id) {
    return runMutation(async () => {
      await apiFetch(`/permintaan/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      state.permintaan = state.permintaan.filter((entry) => entry.id !== id);
      notify();
      return clone(state.permintaan);
    });
  },

  // SYNCHRONOUS cache reads (Phase 9 hydrated-cache pattern) — unchanged
  // signatures so KeputusanDistribusi/StatusDistribusi/Dashboard's
  // snapshot.keputusan / snapshot.riwayatKeputusan reads, and Dashboard's
  // sync store.getKeputusan() handler call, keep working with zero page
  // change. Populated by loadKeputusan()/loadRiwayatKeputusan() below and by
  // each mutator's server response.
  getKeputusan() {
    return clone(state.keputusan);
  },

  getRiwayatKeputusan() {
    return clone(state.riwayatKeputusan);
  },

  // Bootstrap loaders (called on KeputusanDistribusi/StatusDistribusi/
  // Dashboard mount; 09-05 will also call these from store.hydrate()).
  async loadKeputusan() {
    const resp = await apiFetch("/keputusan");
    state.keputusan = resp;
    notify();
    return clone(state.keputusan);
  },

  async loadRiwayatKeputusan() {
    const resp = await apiFetch("/riwayat-keputusan");
    state.riwayatKeputusan = resp;
    notify();
    return clone(state.riwayatKeputusan);
  },

  // Server owns the notification + activity-log side effects for this
  // mutation (keputusanService.addKeputusan, LOGIC-03) — do NOT duplicate
  // pushNotifikasi/recordActivity here. POST /keputusan returns the single
  // created row (not a full list, unlike kota's POST/PUT/DELETE) — mirrors
  // permintaan's addPermintaan response shape (09-03), confirmed against
  // keputusanService.js's toApi(created) return.
  async addKeputusan(entry) {
    return runMutation(async () => {
      const resp = await apiFetch("/keputusan", {
        method: "POST",
        body: {
          kota_tujuan: entry.kota_tujuan,
          volume_tbs: Number(entry.volume_tbs),
          tanggal_keputusan: entry.tanggal_keputusan,
          diputuskan_oleh: entry.diputuskan_oleh,
          status: entry.status,
        },
      });
      state.keputusan = [...state.keputusan, resp];
      state.riwayatKeputusan = [...state.riwayatKeputusan, resp];
      notify();
      return clone(resp);
    });
  },

  // CRITICAL (LOGIC-02): the cache is ONLY written from the server's
  // confirmed response below — never optimistically before the await
  // resolves. On a 409 optimistic-lock conflict, apiFetch throws BEFORE
  // this function reaches the `state.keputusan = ...` line, so the losing
  // concurrent request's cache is left untouched and runMutation's catch
  // Toasts the server's Indonesian conflict message + re-throws for the
  // page to keep its modal open. A false success can never reach the UI.
  async updateKeputusan(id, updates) {
    return runMutation(async () => {
      const resp = await apiFetch(`/keputusan/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: updates,
      });
      state.keputusan = state.keputusan.map((item) => (item.id === id ? resp : item));
      state.riwayatKeputusan = state.riwayatKeputusan.map((item) =>
        item.id === id ? resp : item
      );
      notify();
      return clone(resp);
    });
  },

  // DELETE /keputusan/:id returns the single cancelled row (confirmed
  // against keputusanService.removeKeputusan's toApi(existing) return —
  // NOT a full list, unlike kota's DELETE). The server marks the matching
  // RiwayatKeputusan row "dibatalkan" server-side; refresh riwayat from the
  // server rather than guessing the shape client-side (T-09-D-STALE).
  async removeKeputusan(id) {
    return runMutation(async () => {
      await apiFetch(`/keputusan/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      state.keputusan = state.keputusan.filter((item) => item.id !== id);
      await store.loadRiwayatKeputusan();
      notify();
      return clone(state.keputusan);
    });
  },

  // POST /keputusan/:id/restore returns the single recreated row (confirmed
  // against keputusanService.restoreKeputusan's toApi(created) return —
  // NOT a full list). Body MUST include item.id matching the path, or the
  // route 400s. Refresh riwayat from the server afterward (T-09-D-STALE).
  async restoreKeputusan(item) {
    return runMutation(async () => {
      const resp = await apiFetch(`/keputusan/${encodeURIComponent(item.id)}/restore`, {
        method: "POST",
        body: item,
      });
      state.keputusan = [...state.keputusan, resp];
      await store.loadRiwayatKeputusan();
      notify();
      return clone(resp);
    });
  },

  getNotifikasi() {
    return clone(state.notifikasi);
  },

  tambahNotifikasi(notif) {
    const notifikasiBaru = pushNotifikasi(notif);
    notify();
    return clone(notifikasiBaru);
  },

  tandaiDibaca(id) {
    state.notifikasi = state.notifikasi.map((item) =>
      item.id === id ? { ...item, dibaca: true } : item
    );
    notify();
    return clone(state.notifikasi);
  },

  tandaiSemuaDibaca() {
    state.notifikasi = state.notifikasi.map((item) => ({
      ...item,
      dibaca: true,
    }));
    notify();
    return clone(state.notifikasi);
  },

  getActivityLog() {
    return clone(state.activityLog);
  },

  catatAktivitas(aktor, role, aksi) {
    const activityBaru = pushActivity(aktor, role, aksi);
    notify();
    return clone(activityBaru);
  },

  // Deprecated: v1.0's "reset demo data" reset the client-side seed
  // collections back to their JSON defaults. The server is now the source
  // of truth for all domain data (Phase 9), so there is no client-side seed
  // to reset to — this shim fails loudly rather than silently no-op'ing.
  // Out of scope for 09-01 (auth-only plan) to redesign Layout.jsx's reset
  // affordance; tracked for a later domain plan to either wire a real
  // server-side reset endpoint or remove the UI control.
  reset() {
    throw new Error(
      "store.reset() tidak lagi tersedia — data kini bersumber dari server, tidak ada seed klien untuk direset."
    );
  },
};

export default store;
