import { z } from "zod";

// Mass-assignment allowlist (T-08-P-MASS): only the snake_case fields the
// frontend (src/store.js shape) actually sends pass through validate(); any
// extra body fields are stripped before reaching permintaanService.
// jumlah_permintaan uses z.coerce.number() so numeric strings from
// form-style bodies still validate, then .positive() rejects zero/negative
// tonase server-side regardless of client-side validation (T-08-P-NEG).

export const permintaanCreateSchema = z.object({
  kota: z.string().trim().min(1, "Kota wajib dipilih."),
  tanggal_permintaan: z.string().trim().min(1, "Tanggal permintaan wajib diisi."),
  tanggal_input: z.string().trim().min(1).optional(),
  jumlah_permintaan: z.coerce
    .number({ invalid_type_error: "Jumlah permintaan harus berupa angka." })
    .positive("Jumlah permintaan harus lebih dari 0."),
  keterangan: z.string().trim().optional(),
});

export const permintaanUpdateSchema = z.object({
  kota: z.string().trim().min(1, "Kota wajib dipilih.").optional(),
  tanggal_permintaan: z.string().trim().min(1, "Tanggal permintaan wajib diisi.").optional(),
  tanggal_input: z.string().trim().min(1).optional(),
  jumlah_permintaan: z.coerce
    .number({ invalid_type_error: "Jumlah permintaan harus berupa angka." })
    .positive("Jumlah permintaan harus lebih dari 0.")
    .optional(),
  keterangan: z.string().trim().optional(),
});
