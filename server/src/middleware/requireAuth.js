import { verifyToken } from "../auth/jwt.js";

/**
 * Express middleware: requires a valid Bearer JWT on the Authorization
 * header. Responds 401 if the header is missing/malformed, or if the token
 * fails verification for any reason (expired, tampered, wrong signature,
 * wrong algorithm). On success, attaches req.user = { id, username, role }
 * from the verified token payload and calls next().
 *
 * The underlying jwt verification error is never echoed to the client
 * (see T-07-ERRLEAK2) — only a single generic 401 message is returned.
 */
export default function requireAuth(req, res, next) {
  const header = req.headers?.authorization;

  if (!header || !header.startsWith("Bearer ") || header.slice(7).trim() === "") {
    return res.status(401).json({ error: "Token tidak ada." });
  }

  const token = header.slice(7).trim();

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token tidak valid atau kedaluwarsa." });
  }
}
