import prisma from "../db/prismaClient.js";

/**
 * Returns the full list of cities (Kota rows).
 */
export async function getDaftarKota() {
  return prisma.kota.findMany();
}

/**
 * Returns how many Permintaan/Keputusan rows currently reference the given
 * city name. Mirrors src/store.js's getKotaReferenceCounts field names
 * exactly, for downstream consistency.
 */
export async function getKotaReferenceCounts(nama) {
  const [permintaanCount, keputusanCount] = await Promise.all([
    prisma.permintaan.count({ where: { kotaNama: nama } }),
    prisma.keputusan.count({ where: { kotaTujuanNama: nama } }),
  ]);

  return { permintaanCount, keputusanCount };
}

/**
 * Creates a new city. Mirrors src/store.js's tambahKota exactly: throws the
 * same Indonesian duplicate-name message when a city with that name already
 * exists, otherwise creates the row and returns the refreshed city list.
 */
export async function tambahKota({ nama, kapasitas }) {
  const namaTrim = nama.trim();

  const existing = await prisma.kota.findUnique({ where: { nama: namaTrim } });
  if (existing) {
    throw new Error("Kota dengan nama tersebut sudah ada.");
  }

  await prisma.kota.create({
    data: { nama: namaTrim, kapasitas: Number(kapasitas) || 0 },
  });

  return getDaftarKota();
}

/**
 * Renames a city and cascades the new name across every Permintaan,
 * Keputusan, and RiwayatKeputusan row that referenced the old name.
 * All-or-nothing: wrapped in a single transaction so a mid-cascade failure
 * rolls back everything, leaving no partially-renamed state.
 */
export async function updateKota(namaLama, { nama, kapasitas }) {
  const namaBaru = nama.trim();

  if (namaBaru !== namaLama) {
    const existing = await prisma.kota.findUnique({ where: { nama: namaBaru } });
    if (existing) {
      throw new Error("Kota dengan nama tersebut sudah ada.");
    }
  }

  const kapasitasBaru = Number(kapasitas) || 0;

  const operations = [
    prisma.kota.update({
      where: { nama: namaLama },
      data: { nama: namaBaru, kapasitas: kapasitasBaru },
    }),
  ];

  if (namaBaru !== namaLama) {
    operations.push(
      prisma.permintaan.updateMany({
        where: { kotaNama: namaLama },
        data: { kotaNama: namaBaru },
      }),
      prisma.keputusan.updateMany({
        where: { kotaTujuanNama: namaLama },
        data: { kotaTujuanNama: namaBaru },
      }),
      prisma.riwayatKeputusan.updateMany({
        where: { kotaTujuanNama: namaLama },
        data: { kotaTujuanNama: namaBaru },
      })
    );
  }

  await prisma.$transaction(operations);

  return getDaftarKota();
}

/**
 * Deletes a city, but only if it is not referenced by any Permintaan or
 * Keputusan row. Throws the same Indonesian error message as src/store.js
 * when the city is still in use.
 */
export async function hapusKota(nama) {
  const { permintaanCount, keputusanCount } = await getKotaReferenceCounts(nama);

  if (permintaanCount > 0 || keputusanCount > 0) {
    throw new Error(
      `Kota ${nama} tidak bisa dihapus karena masih digunakan oleh ${permintaanCount} permintaan dan ${keputusanCount} keputusan distribusi.`
    );
  }

  await prisma.kota.delete({ where: { nama } });

  return getDaftarKota();
}
