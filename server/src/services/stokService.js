import prisma from "../db/prismaClient.js";

const SINGLETON_ID = "singleton";

/**
 * Returns the current TBS stock value from the Stok singleton row.
 * Mirrors src/store.js's getStokTbs() return type (plain number). If the
 * singleton row is missing (should not happen after seeding), defensively
 * returns 0 instead of throwing.
 */
export async function getStokTbs() {
  const row = await prisma.stok.findUnique({ where: { id: SINGLETON_ID } });
  return row ? row.stokTbs : 0;
}

/**
 * Sets the TBS stock value, upserting the Stok singleton row. Coerces the
 * input the same way src/store.js's setStokTbs does (Number(value) || 0),
 * so non-numeric or falsy input never corrupts the stored value. Returns
 * the new number.
 */
export async function setStokTbs(value) {
  const numericValue = Number(value) || 0;

  await prisma.stok.upsert({
    where: { id: SINGLETON_ID },
    update: { stokTbs: numericValue },
    create: { id: SINGLETON_ID, stokTbs: numericValue },
  });

  return numericValue;
}
