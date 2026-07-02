import { getPermintaan } from "./permintaanService.js";
import { getDaftarKota } from "./kotaService.js";
import { aggregatePermintaanRanking } from "./distribusiService.js";

/**
 * Menyediakan agregat demo untuk halaman Landing (pra-login, tanpa JWT):
 * ranking kota berdasarkan total permintaan + daftar kota beserta
 * kapasitasnya. Reuse service layer yang sudah ada (tidak ada query Prisma
 * mentah di sini) — hanya membentuk ulang hasilnya ke payload publik yang
 * dibatasi (lihat komentar di publicRoutes.js untuk alasan endpoint ini
 * tidak ber-auth).
 */
export async function getLandingStats() {
  const [permintaan, daftarKota] = await Promise.all([getPermintaan(), getDaftarKota()]);

  const ranking = aggregatePermintaanRanking(permintaan);
  const daftarKotaPublik = daftarKota.map((kota) => ({
    nama: kota.nama,
    kapasitas: kota.kapasitas,
  }));

  return { ranking, daftarKota: daftarKotaPublik };
}
