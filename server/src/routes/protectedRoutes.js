import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// Demo routes proving the requireAuth/requireRole guard contract for
// AUTH-03/AUTH-04. Phase 8 replaces these with real domain routes that
// reuse the same middleware composition (requireAuth before requireRole).

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.post("/admin-only", requireAuth, requireRole("Admin"), (req, res) => {
  res.status(200).json({ ok: true });
});

router.post("/manajer-only", requireAuth, requireRole("Manajer Distribusi"), (req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
