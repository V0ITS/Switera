import permintaanSeed from "./data/permintaan.json";
import keputusanSeed from "./data/keputusan.json";

const roleSeed = "Admin";
const akunSeed = [
  {
    id: "U001",
    nama: "Budi Santoso",
    username: "manajer",
    password: "manajer123",
    role: "Manajer Distribusi",
  },
  {
    id: "U002",
    nama: "Rina Wati",
    username: "logistik",
    password: "logistik123",
    role: "Tim Logistik",
  },
  {
    id: "U003",
    nama: "Administrator",
    username: "admin",
    password: "admin123",
    role: "Admin",
  },
];
const kotaSeed = [
  "Pekanbaru",
  "Medan",
  "Palembang",
  "Jambi",
  "Padang",
  "Dumai",
  "Bengkalis",
  "Rokan Hilir",
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizePermintaanEntry = (entry) => ({
  ...entry,
  tanggal_permintaan: entry.tanggal_permintaan ?? entry.tanggal_input ?? "",
  tanggal_input: entry.tanggal_input ?? entry.tanggal_permintaan ?? "",
});
const normalizePermintaanList = (items) => items.map(normalizePermintaanEntry);
const getNextId = (items, prefix) => {
  const nextNumber =
    items.reduce((maxValue, item) => {
      const numericId = Number(String(item.id).replace(/\D/g, ""));
      return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

const state = {
  userAktif: null,
  daftarAkun: clone(akunSeed),
  roleAktif: roleSeed,
  daftarKota: clone(kotaSeed),
  permintaan: normalizePermintaanList(clone(permintaanSeed)),
  keputusan: clone(keputusanSeed),
  riwayatKeputusan: clone(keputusanSeed),
};

const listeners = new Set();

const notify = () => {
  const snapshot = store.getState();
  listeners.forEach((listener) => listener(snapshot));
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
    state.userAktif = user ? clone(user) : null;
    if (user?.role) {
      state.roleAktif = user.role;
    }
    notify();
    return store.getUserAktif();
  },

  getDaftarAkun() {
    return clone(state.daftarAkun);
  },

  tambahAkun(akun) {
    const akunBaru = clone(akun);
    state.daftarAkun = [...state.daftarAkun, akunBaru];
    notify();
    return clone(akunBaru);
  },

  cariAkun(username, password, role) {
    const normalizedUsername = String(username).trim();
    const akunDitemukan = state.daftarAkun.find(
      (akun) =>
        akun.username === normalizedUsername &&
        akun.password === password &&
        akun.role === role
    );

    return akunDitemukan ? clone(akunDitemukan) : null;
  },

  logout() {
    state.userAktif = null;
    notify();
    return store.getState();
  },

  getPermintaan() {
    return clone(state.permintaan);
  },

  getDaftarKota() {
    return clone(state.daftarKota);
  },

  getRoleAktif() {
    return state.roleAktif;
  },

  setRoleAktif(role) {
    return updateValue("roleAktif", role);
  },

  hasPermintaanDuplikat({ kota, tanggalPermintaan, excludeId }) {
    return state.permintaan.some(
      (item) =>
        item.kota === kota &&
        item.tanggal_permintaan === tanggalPermintaan &&
        item.id !== excludeId
    );
  },

  addPermintaan(entry) {
    return updateCollection("permintaan", (items) => [
      ...items,
      {
        ...clone(entry),
        id: entry.id ?? getNextId(items, "PMT"),
      },
    ]);
  },

  updatePermintaan(id, updates) {
    return updateCollection("permintaan", (items) =>
      items.map((item) =>
        item.id === id ? { ...item, ...clone(updates) } : item
      )
    );
  },

  removePermintaan(id) {
    return updateCollection("permintaan", (items) =>
      items.filter((item) => item.id !== id)
    );
  },

  getKeputusan() {
    return clone(state.keputusan);
  },

  getRiwayatKeputusan() {
    return clone(state.riwayatKeputusan);
  },

  addKeputusan(entry) {
    const keputusanBaru = {
      ...clone(entry),
      id: entry.id ?? getNextId(state.riwayatKeputusan, "KPT"),
    };

    state.keputusan = [...state.keputusan, keputusanBaru];
    state.riwayatKeputusan = [...state.riwayatKeputusan, keputusanBaru];
    notify();
    return clone(keputusanBaru);
  },

  updateKeputusan(id, updates) {
    const normalizedUpdates = clone(updates);
    state.keputusan = state.keputusan.map((item) =>
      item.id === id ? { ...item, ...normalizedUpdates } : item
    );
    state.riwayatKeputusan = state.riwayatKeputusan.map((item) =>
      item.id === id ? { ...item, ...normalizedUpdates } : item
    );
    notify();
    return clone(state.keputusan);
  },

  removeKeputusan(id) {
    state.riwayatKeputusan = state.riwayatKeputusan.map((item) =>
      item.id === id ? { ...item, status: "dibatalkan" } : item
    );
    state.keputusan = state.keputusan.filter((item) => item.id !== id);
    notify();
    return clone(state.keputusan);
  },

  reset() {
    state.permintaan = normalizePermintaanList(clone(permintaanSeed));
    state.keputusan = clone(keputusanSeed);
    state.riwayatKeputusan = clone(keputusanSeed);
    notify();
    return store.getState();
  },
};

export default store;
