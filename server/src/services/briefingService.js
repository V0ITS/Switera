import {
  getSituasiHariIni,
  getTindakanMendesak,
  getRekomendasiPrioritas,
  getKpiManajer,
} from "./misService.js";
import { generateText } from "./geminiClient.js";

// AI-3: briefing harian naratif untuk Dashboard Manajer. Seperti AI-1/AI-2,
// AI tidak menghitung apa pun — ia menarasikan agregat yang sudah dihitung
// lapisan MIS (situasi, tindakan mendesak, kinerja vs target, prioritas)
// sehingga briefing selalu konsisten dengan angka di layar.

const SYSTEM_PROMPT = [
  "Kamu adalah asisten Manajer Distribusi Switera, aplikasi manajemen",
  "distribusi stok TBS (tandan buah segar kelapa sawit) antar kota. Tulis",
  "briefing singkat awal hari dalam Bahasa Indonesia.",
  "",
  "Aturan penulisan:",
  "- 2-3 paragraf pendek. Buka langsung dari kondisi paling penting hari",
  "  ini (stok, permintaan menunggu, tindakan mendesak paling kritis).",
  "- Sebut pencapaian target: mana indikator yang tercapai dan mana yang",
  "  meleset, dengan angka persis dari data — jangan mengarang.",
  "- Tutup dengan maksimal 3 prioritas aksi hari ini bernomor ('1.', '2.',",
  "  '3.' di awal baris), diambil dari tindakan mendesak dan rekomendasi",
  "  prioritas pada data.",
  "- Teks polos; tanpa heading, tanpa markdown, tanpa sapaan pembuka atau",
  "  penutup.",
].join("\n");

export async function buatBriefingHarian() {
  const [situasi, tindakan, prioritas, kpi] = await Promise.all([
    getSituasiHariIni(),
    getTindakanMendesak(),
    getRekomendasiPrioritas(),
    getKpiManajer(),
  ]);

  const dataBriefing = {
    situasiHariIni: situasi,
    tindakanMendesakTeratas: tindakan.slice(0, 5).map((item) => ({
      tingkat: item.tingkat,
      judul: item.judul,
      deskripsi: item.deskripsi,
    })),
    kinerjaVsTarget: kpi,
    prioritasTeratas: prioritas.slice(0, 3).map((item) => ({
      kota: item.kota,
      skorUrgensi: item.skorUrgensi,
      hariTanpaDistribusi: item.hariTanpaDistribusi,
      statusKeputusanAktif: item.statusKeputusanAktif,
    })),
  };

  const briefing = await generateText({
    system: SYSTEM_PROMPT,
    prompt: `Buat briefing harian Manajer Distribusi dari data berikut:\n\n${JSON.stringify(dataBriefing, null, 2)}`,
  });

  return {
    briefing,
    dibuatPada: new Date().toISOString(),
  };
}
