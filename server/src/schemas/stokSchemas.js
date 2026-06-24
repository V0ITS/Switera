import { z } from "zod";

// Body shape: { stokTbs: number }. Mirrors src/store.js's setStokTbs single-
// value semantics — stokTbs is the one field this schema allowlists
// (T-08-K-MASS), coerced from numeric strings the same way kotaSchemas does.

export const stokUpdateSchema = z.object({
  stokTbs: z.coerce
    .number({ invalid_type_error: "Stok harus berupa angka." })
    .int("Stok harus berupa bilangan bulat.")
    .nonnegative("Stok tidak boleh negatif."),
});
