# ⚡ ZaamTools

Platform intelijen data premium — NIK Parser & IP Tracker.

## 📁 Struktur File

```
zaamtools/
├── index.html       → Landing page (pengenalan & fitur)
├── dashboard.html   → Halaman utama tools
├── api.php          → Backend proxy ke Nexray API
├── vercel.json      → Konfigurasi deploy Vercel
├── media.mp4        → Video loading screen (wajib disiapkan sendiri, rasio 9:16)
└── README.md
```

## 🚀 Deploy ke Vercel

### Cara 1 — Vercel CLI
```bash
npm i -g vercel
cd zaamtools
vercel
```

### Cara 2 — Via GitHub
1. Upload semua file ke repo GitHub
2. Buka https://vercel.com → Import Project
3. Pilih repo kamu → Deploy

> **Catatan:** Pastikan PHP runtime didukung. Gunakan `vercel-php@0.6.0` seperti pada `vercel.json`.

## 🎬 Media Video (media.mp4)

Siapkan file `media.mp4` dengan spesifikasi:
- **Rasio:** 9:16 (vertikal, seperti stories Instagram)
- **Resolusi:** Minimal 720×1280 px
- **Durasi:** 2–5 detik
- **Format:** MP4 (H.264)

Video ini tampil saat pengguna klik tombol **"Mulai Sekarang"** di `index.html`.

## 🌐 API yang Digunakan

| Tool       | Endpoint                                              |
|------------|-------------------------------------------------------|
| NIK Parser | `https://api.nexray.eu.cc/tools/nikparse?nik=...`    |
| IP Tracker | `https://api.nexray.eu.cc/tools/trackip?target=...`  |

Credit: **@nexray — ElrayyXml**

## 💻 Jalankan Lokal

Butuh server PHP lokal (bukan buka HTML langsung di browser):

```bash
# Dengan PHP built-in server
php -S localhost:8080

# Lalu buka di browser:
# http://localhost:8080
```

## ✨ Fitur

- 🎨 Desain dark premium dengan glassmorphism
- 🖱️ Custom cursor dengan animasi
- 📱 Fully responsive (mobile & desktop)
- 🗺️ Peta interaktif Leaflet.js untuk IP Tracker
- 📜 Riwayat pencarian (localStorage)
- 🎬 Loading screen video 9:16 dengan progress bar
- 🌈 Highlight JSON raw output
- ⚡ Smooth transitions & animasi

## 📝 Lisensi

Free to use. Credit to Nexray API.
