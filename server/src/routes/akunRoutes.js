import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { roleOptions } from "./roleOptions.js";
import { getDaftarAkun, updateAkun, hapusAkun } from "../services/akunService.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const daftar = await getDaftarAkun();
    return res.status(200).json(daftar);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nama, role } = req.body ?? {};

    if (!nama?.trim()) {
      return res.status(400).json({ error: "Nama wajib diisi." });
    }
    if (role && !roleOptions.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid." });
    }

    const akun = await updateAkun(id, { nama, role });
    return res.status(200).json(akun);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const akun = await hapusAkun(id, requesterId);
    return res.status(200).json(akun);
  } catch (error) {
    return next(error);
  }
});

export default router;
