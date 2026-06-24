import { z } from "zod";

// Mass-assignment allowlist (T-08-K-MASS): only nama + kapasitas pass
// through validate(); any extra body fields are stripped before reaching
// kotaService. kapasitas accepts coercion so numeric strings from form
// bodies (e.g. "120") still validate, matching src/store.js's
// Number(kapasitas) || 0 leniency while still rejecting negative/invalid
// values up front with a field-level message.

export const kotaCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama kota wajib diisi."),
  kapasitas: z.coerce
    .number({ invalid_type_error: "Kapasitas harus berupa angka." })
    .int("Kapasitas harus berupa bilangan bulat.")
    .nonnegative("Kapasitas tidak boleh negatif."),
});

export const kotaUpdateSchema = z.object({
  nama: z.string().trim().min(1, "Nama kota wajib diisi."),
  kapasitas: z.coerce
    .number({ invalid_type_error: "Kapasitas harus berupa angka." })
    .int("Kapasitas harus berupa bilangan bulat.")
    .nonnegative("Kapasitas tidak boleh negatif."),
});
