/**
 * Express middleware factory: validate(schema) parses req.body against the
 * given Zod schema. On failure, responds 400 with a field-level error
 * object: { error: "Validasi gagal.", fields: { <dotted.path>: <message> } }
 * and does NOT call next(). On success, replaces req.body with the parsed
 * data (schema.safeParse's result.data) so downstream handlers only ever
 * see allowlisted fields — this is the mass-assignment defense (see
 * threat_model T-08-MASSASSIGN): handlers must never blind-spread an
 * unvalidated req.body into Prisma, they must spread the validated DTO
 * that this middleware attaches.
 *
 * Per-field messages are whatever the schema author supplied (custom Zod
 * messages should be written in Indonesian by the schema authors in
 * Wave 2/3) — this middleware only owns the generic top-level label.
 */
export function validate(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        fields[path] = issue.message;
      }
      return res.status(400).json({ error: "Validasi gagal.", fields });
    }

    req.body = result.data;
    return next();
  };
}
