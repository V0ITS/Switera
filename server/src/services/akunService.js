import bcrypt from "bcryptjs";
import prisma from "../db/prismaClient.js";

const BCRYPT_COST_FACTOR = 10;

const stripPassword = (akun) => {
  if (!akun) return akun;
  const { password, ...rest } = akun;
  return rest;
};

/**
 * Verifies a username/password/role triple against the live Akun table
 * using bcrypt.compare. Returns the account (without the password field) on
 * a correct match, or null if the username doesn't exist, the password is
 * wrong, or the selected role doesn't match the account's actual role.
 * Never throws on a mismatch — null is the normal "no match" result.
 *
 * Role mismatch is folded into the SAME null path as wrong-password/
 * unknown-username (not a distinct error), so the route layer maps it to
 * the identical generic 401 message — this is what keeps anti-enumeration
 * intact (T-07-ENUM) while still rejecting a selected role that doesn't
 * match the account's real role (v1.0 parity).
 */
export async function verifyLogin(username, password, role) {
  const normalizedUsername = String(username).trim();

  const akun = await prisma.akun.findUnique({
    where: { username: normalizedUsername },
  });

  if (!akun) {
    return null;
  }

  const cocok = await bcrypt.compare(password, akun.password);
  if (!cocok) {
    return null;
  }

  if (akun.role !== role) {
    return null;
  }

  return stripPassword(akun);
}

/**
 * Returns the next "U###" account id, mirroring src/store.js's getNextId
 * behavior for the "U" prefix: zero-padded to 3 digits, collision-safe
 * against the max existing numeric suffix.
 */
export async function getNextAkunId() {
  const daftarAkun = await prisma.akun.findMany({ select: { id: true } });
  const existingIds = new Set(daftarAkun.map((akun) => String(akun.id)));

  let nextNumber =
    daftarAkun.reduce((maxValue, akun) => {
      const numericId = Number(String(akun.id).replace(/\D/g, ""));
      return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
    }, 0) + 1;

  let candidate = `U${String(nextNumber).padStart(3, "0")}`;
  while (existingIds.has(candidate)) {
    nextNumber += 1;
    candidate = `U${String(nextNumber).padStart(3, "0")}`;
  }

  return candidate;
}

/**
 * Creates a new Akun row with a bcrypt-hashed password (cost factor 10,
 * matching prisma/seed.js's BCRYPT_COST_FACTOR). Throws if the username is
 * already taken. The plaintext password only ever exists as a function
 * argument and transiently inside bcrypt.hash — it is never persisted
 * unhashed (see T-07-PWHASH).
 */
export async function registerAkun({ nama, username, role }, password) {
  const normalizedUsername = String(username).trim();

  const existing = await prisma.akun.findUnique({
    where: { username: normalizedUsername },
  });

  if (existing) {
    throw new Error("Username sudah digunakan.");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
  const id = await getNextAkunId();

  const akun = await prisma.akun.create({
    data: {
      id,
      nama,
      username: normalizedUsername,
      password: hashedPassword,
      role,
    },
  });

  return stripPassword(akun);
}
