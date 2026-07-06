# Panduan Desain (Design System) - Grass.io

## 1. Tema & Gaya Visual (Art Direction)
* **Gaya Utama:** Neo-Brutalism / Playful Tech.
* **Karakteristik Visual:** Desain ini mengandalkan kontras yang sangat tinggi, garis tepi (stroke/border) hitam yang tebal, bayangan padat tanpa efek blur (*hard drop-shadows*), sudut membulat (*rounded corners*) yang ekstrem pada elemen UI, dan ilustrasi vektor 2D datar bergaya stiker. Memberikan kesan ramah, modern, namun tetap bernuansa teknikal (Web3/Crypto).

## 2. Palet Warna
Desain ini memiliki dukungan mode Terang (Light) dan Gelap (Dark).
* **Warna Utama (Aksen):**
  * **Neon/Lime Green:** Perkiraan `#BCF819` atau `#C4FF00`. Digunakan secara agresif untuk tombol utama (Call to Action), spanduk, dan indikator aktif.
* **Mode Terang (Light Mode):**
  * **Background Utama:** Putih (`#FFFFFF`) atau *Off-White*.
  * **Background Kartu Sekunder:** Hijau Pastel / Krem Muda (Perkiraan `#EAFCC2`).
  * **Teks, Garis Tepi & Bayangan:** Hitam Pekat (`#000000`) atau Dark Charcoal (`#111111`).
* **Mode Gelap (Dark Mode):**
  * **Background Utama:** Abu-abu Sangat Gelap / Charcoal.
  * **Background Kartu:** Abu-abu Gelap (sedikit lebih terang dari background utama).
  * **Teks & Garis Tepi (opsional):** Putih atau Off-White.

## 3. Tipografi
* **Font Utama:** Bricolage Grotesque.
* **Hierarki Teks:**
  * **Headings (H1, H2, H3):** Menggunakan bobot *Bold* (700) atau *Extra Bold* (800). Jarak antar huruf (*letter-spacing*) dibuat agak rapat (*tracking-tight*) untuk memberikan kesan solid dan brutalist.
  * **Body Text:** Menggunakan bobot *Regular* (400) atau *Medium* (500). Ukuran font cukup besar (sekitar 16px - 18px) untuk memastikan keterbacaan yang optimal.
  * **Labels / Buttons:** Sering kali menggunakan huruf kapital (Uppercase) atau kombinasi *Title Case* dengan bobot *Bold*.

## 4. Komponen UI (UI Components)
* **Cards (Kartu Konten & Dasbor):**
  * **Bentuk:** Persegi panjang dengan *border-radius* yang besar (sekitar 16px - 24px).
  * **Border:** Garis tepi tebal yang solid (contoh: `border: 2px solid #000`).
  * **Bayangan (Shadow):** *Hard shadow* ke arah kanan bawah (contoh CSS: `box-shadow: 4px 4px 0px 0px #000000`).
* **Buttons (Tombol):**
  * **Bentuk:** Kapsul memanjang (*pill-shaped* / `border-radius: 9999px`).
  * **Gaya Utama:** Latar belakang Hijau Neon, teks hitam tebal, dengan garis tepi hitam.
* **Pills / Badges / Toggles:**
  * Digunakan untuk nomor urutan (1, 2, 3), status, atau *toggle* tema. Berbentuk lingkaran atau kapsul dengan warna kontras dan *outline* hitam.