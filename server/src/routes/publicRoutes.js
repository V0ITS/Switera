import express from "express";
import { getLandingStats } from "../services/publicService.js";

// Router ini SENGAJA tidak memakai middleware otentikasi/otorisasi apa pun.
// Halaman Landing (src/pages/Landing.jsx) tampil SEBELUM login, tanpa JWT,
// sehingga widget ranking + peta demonya harus mengambil data dari endpoint
// yang benar-benar publik agar tidak 401/redirect-loop pra-login
// (T-09-LAND-401). Data yang diekspos di sini hanya agregat non-sensitif
// (ranking total permintaan per kota + kapasitas kota), tanpa PII.

const router = express.Router();

router.get("/landing-stats", async (req, res, next) => {
  try {
    return res.status(200).json(await getLandingStats());
  } catch (error) {
    return next(error);
  }
});

export default router;
