/**
 * Central Express error-handling middleware (4-arg signature, recognized
 * by Express as an error handler). Maps service-layer thrown errors to the
 * correct HTTP status:
 *
 * - err.statusCode (if set) is honored directly — the preferred convention
 *   going forward. Wave 2/3 services should throw
 *   `Object.assign(new Error(msg), { statusCode: 409 })` for precise
 *   control instead of relying on message matching.
 * - Falls back to matching the established Indonesian error strings from
 *   Phase 6/7 services that pre-date the statusCode convention:
 *     - "sudah ada" / "sudah digunakan" -> 409 (conflict / duplicate)
 *     - "tidak bisa dihapus"            -> 409 (referential block)
 *     - "tidak ditemukan"               -> 404
 * - Everything else -> 500 with a generic message. The 500 path NEVER
 *   echoes err.stack or the raw err.message (see T-08-ERRLEAK) — only the
 *   mapped 4xx Indonesian messages above are ever surfaced to the client.
 */
export function errorHandler(err, req, res, next) {
  const message = err?.message ?? "";

  if (err?.statusCode) {
    return res.status(err.statusCode).json({ error: message || "Terjadi kesalahan." });
  }

  if (message.includes("sudah ada") || message.includes("sudah digunakan")) {
    return res.status(409).json({ error: message });
  }

  if (message.includes("tidak bisa dihapus")) {
    return res.status(409).json({ error: message });
  }

  if (message.includes("tidak ditemukan")) {
    return res.status(404).json({ error: message });
  }

  return res.status(500).json({ error: "Terjadi kesalahan pada server." });
}
