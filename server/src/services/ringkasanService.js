import { getDaftarKota } from "./kotaService.js";
import { getPermintaan } from "./permintaanService.js";
import { getStokTbs } from "./stokService.js";
import { getKeputusan, getRiwayatKeputusan } from "./keputusanService.js";
import { getKpiMetrics } from "./distribusiService.js";

// AI-1: ringkasan naratif halaman Laporan. Panggilan Gemini API hanya
// terjadi di sini (server-side) — GEMINI_API_KEY dibaca dari server/.env
// dan tidak pernah dikirim ke frontend. Gemini dipilih karena punya free
// tier tanpa kartu kredit (aistudio.google.com), cukup untuk demo sekolah.
// Dipanggil via fetch bawaan Node (REST v1beta), tanpa dependency baru.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw Object.assign(
      new Error(
        "Ringkasan AI belum dikonfigurasi. Set GEMINI_API_KEY di server/.env lalu restart server."
      ),
      { statusCode: 503 }
    );
  }
  return key.trim();
};

// Ported verbatim dari src/utils/distribusi.js (getPeriodRange/isDateInRange)
// agar angka pada ringkasan cocok persis dengan filter periode yang dilihat
// pengguna di Laporan.jsx. Jangan ubah logikanya di salah satu sisi saja.
const parseDate = (value) => new Date(`${value}T00:00:00`);

const getPeriodRange = (periode, baseDate = new Date()) => {
  const today = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );

  if (periode === "minggu-ini") {
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start, end };
};

const isDateInRange = (value, range) => {
  const current = parseDate(value);
  return current >= range.start && current <= range.end;
};

const periodeLabels = {
  semua: "seluruh periode",
  "minggu-ini": "minggu ini",
  "bulan-ini": "bulan ini",
};

const totalTon = (rows, field) =>
  rows.reduce((total, item) => total + (Number(item[field]) || 0), 0);

const topKota = (rows, kotaField, volumeField, limit = 8) => {
  const grouped = rows.reduce((result, item) => {
    const kota = item[kotaField];
    result.set(kota, (result.get(kota) ?? 0) + (Number(item[volumeField]) || 0));
    return result;
  }, new Map());

  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kota, ton]) => ({ kota, ton }));
};

// Agregat ringkas (bukan baris mentah) supaya prompt tetap kecil berapa pun
// besar datanya — Claude menerima angka yang sudah dihitung server, bukan
// dump tabel.
const buildDataLaporan = (periode, role, data) => {
  const { permintaan, keputusan, riwayat, daftarKota, stokTbs, kpi } = data;
  const range = periode === "semua" ? null : getPeriodRange(periode);

  const filteredPermintaan = permintaan.filter(
    (item) => !range || isDateInRange(item.tanggal_permintaan, range)
  );
  const filteredKeputusan = keputusan.filter(
    (item) => !range || isDateInRange(item.tanggal_keputusan, range)
  );
  const filteredRiwayat = riwayat.filter(
    (item) => !range || isDateInRange(item.tanggal_keputusan, range)
  );

  const statusCounts = { menunggu: 0, "dalam-pengiriman": 0, selesai: 0 };
  filteredKeputusan.forEach((item) => {
    if (statusCounts[item.status] !== undefined) {
      statusCounts[item.status] += 1;
    }
  });

  return {
    periode: periodeLabels[periode] ?? periode,
    sudutPandang:
      role === "Tim Logistik"
        ? "Tim Logistik (fokus operasional: progres pengiriman, armada, status distribusi)"
        : "Manajer Distribusi (fokus manajerial: riwayat keputusan, pemenuhan permintaan, alokasi antar kota)",
    stokTbsSaatIniTon: stokTbs,
    jumlahKotaTerdaftar: daftarKota.length,
    permintaan: {
      jumlahEntri: filteredPermintaan.length,
      totalTon: totalTon(filteredPermintaan, "jumlah_permintaan"),
      kotaTeratas: topKota(filteredPermintaan, "kota", "jumlah_permintaan"),
    },
    distribusiAktif: {
      jumlah: filteredKeputusan.length,
      totalTon: totalTon(filteredKeputusan, "volume_tbs"),
      statusPengiriman: statusCounts,
      kotaTujuanTeratas: topKota(filteredKeputusan, "kota_tujuan", "volume_tbs"),
    },
    riwayatKeputusan: {
      jumlah: filteredRiwayat.length,
      totalTon: totalTon(filteredRiwayat, "volume_tbs"),
      selesai: filteredRiwayat.filter((item) => item.status === "selesai").length,
      dibatalkan: filteredRiwayat.filter((item) => item.status === "dibatalkan").length,
    },
    kpi: {
      tingkatPemenuhanPersen: kpi.fulfillmentRate,
      tepatWaktuPersen: kpi.onTimeRate,
      rataRataSiklusJam:
        kpi.avgSiklusJam === null ? null : Math.round(kpi.avgSiklusJam * 10) / 10,
      kotaTercover: kpi.kotaTercover,
      totalKota: kpi.totalKota,
    },
  };
};

const SYSTEM_PROMPT = [
  "Kamu adalah analis distribusi untuk Switera, aplikasi manajemen distribusi",
  "stok TBS (tandan buah segar kelapa sawit) antar kota. Tugasmu menulis",
  "ringkasan laporan distribusi dalam Bahasa Indonesia yang baik.",
  "",
  "Aturan penulisan:",
  "- Tulis 2-4 paragraf naratif yang mengalir; tanpa heading, tanpa bullet,",
  "  tanpa markdown, tanpa sapaan pembuka atau penutup.",
  "- Mulai langsung dari temuan terpenting untuk sudut pandang pembaca.",
  "- Sebut angka penting (total ton, jumlah pengiriman, persentase KPI)",
  "  persis seperti pada data — jangan mengarang atau membulatkan sendiri.",
  "- Jika suatu nilai null atau datanya kosong, katakan datanya belum",
  "  tersedia; jangan berspekulasi.",
  "- Tutup dengan satu observasi atau perhatian yang layak ditindaklanjuti",
  "  (mis. kota dengan permintaan belum terpenuhi, pengiriman menumpuk di",
  "  status tertentu, atau stok menipis).",
].join("\n");

const extractText = (data) =>
  (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

export async function buatRingkasanLaporan(periode, role) {
  const apiKey = getApiKey();

  const [permintaan, keputusan, riwayat, daftarKota, stokTbs, kpi] =
    await Promise.all([
      getPermintaan(),
      getKeputusan(),
      getRiwayatKeputusan(),
      getDaftarKota(),
      getStokTbs(),
      getKpiMetrics(),
    ]);

  const dataLaporan = buildDataLaporan(periode, role, {
    permintaan,
    keputusan,
    riwayat,
    daftarKota,
    stokTbs,
    kpi,
  });

  // Kegagalan layanan AI tidak boleh bocor sebagai 500 generik — semua
  // jalur gagal dipetakan ke pesan Indonesia yang bisa ditampilkan
  // langsung oleh Laporan.jsx.
  let response;
  try {
    response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Buat ringkasan laporan distribusi dari data berikut:\n\n${JSON.stringify(dataLaporan, null, 2)}`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw Object.assign(
      new Error("Tidak dapat menghubungi layanan AI. Periksa koneksi internet server."),
      { statusCode: 502 }
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw Object.assign(
      new Error("Kunci API layanan AI tidak valid. Periksa GEMINI_API_KEY di server/.env."),
      { statusCode: 503 }
    );
  }
  if (response.status === 429) {
    throw Object.assign(
      new Error("Kuota gratis layanan AI tercapai. Coba lagi beberapa saat lagi."),
      { statusCode: 503 }
    );
  }
  if (!response.ok) {
    throw Object.assign(
      new Error("Layanan AI mengalami gangguan. Coba lagi nanti."),
      { statusCode: 502 }
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const ringkasan = extractText(payload);

  if (!ringkasan) {
    throw Object.assign(
      new Error("Layanan AI tidak mengembalikan ringkasan. Coba lagi."),
      { statusCode: 502 }
    );
  }

  return {
    ringkasan,
    periode,
    dibuatPada: new Date().toISOString(),
  };
}
