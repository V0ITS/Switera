/**
 * Express middleware factory: requireRole(...allowedRoles) returns a
 * middleware that responds 403 when req.user.role is not in allowedRoles.
 * Assumes requireAuth has already run and set req.user.
 *
 * Allowed roles are passed explicitly per route — this does NOT consult
 * src/utils/navigation.js's menuByRole, which is frontend-only cosmetic
 * gating, never a security boundary (see AUTH-03, T-07-RBAC-BYPASS).
 */
export default function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Token tidak ada." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Anda tidak memiliki izin untuk aksi ini." });
    }

    return next();
  };
}
