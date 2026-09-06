# 🦊 NARA — Teman Belajarmu Menuju Penguasaan OSN

> **"Langkah kecil hari ini, perubahan besar nanti."**  
> *LEARN • FOCUS • GROW • TOGETHER*

Nara adalah aplikasi pelacak belajar cerdas dan terpadu untuk siswa peserta **Olimpiade Sains Nasional (OSN)**. Nara mendampingi siswa dengan siklus belajar aktif, mulai dari penjadwalan terintegrasi Google Calendar, anotasi materi PDF offline, metode tebak label untuk *active recall*, hingga pelacak fokus *deep-work*.

---

## 🌟 Fitur Utama (Fase 0 & Fase 1)

### 1. Branding & Maskot Rubah Putih Nara
- **Maskot Cerdas**: Rubah putih Nara hadir sebagai teman belajar yang suportif di setiap lifecycle aplikasi:
  - `idle`: Menyapa ramah di halaman awal & dashboard.
  - `focus`: Membaca materi dengan tekun saat sesi belajar.
  - `thinking`: Menganalisis topik atau mengingatkan masa aktif lisensi.
  - `success`: Merayakan pencapaian dan keberhasilan tugas.
  - `error`: Memberi semangat saat terjadi kendala koneksi atau kesalahan sistem.
  - `sleep`: Menemani saat sistem sedang memuat/menyiapkan data (*loading state*).
- Komponen Reusable: `<NaraMascot pose="..." size="..." />` dilengkapi dengan *vector silhouette fallback* SVG presisi tinggi dan `<NaraBubble>` untuk dialog kontekstual.

### 2. Tiga Lapis Tema Warna (Tailwind CSS)
- **Brand**: Hitam `#000000` & Putih `#FFFFFF`.
- **Mode Tampilan**: Light Mode (`#FFFFFF`) & Dark Mode (`#121212`) dengan tombol toggle instan (default mengikuti sistem perangkat).
- **Aksen & Fungsional**:
  - Warna aksen utama: Biru medium-cerah `#2563EB`.
  - Token Prioritas: `very-high` (merah), `high` (oranye), `medium` (kuning), `low` (hijau muda), `very-low` (abu-abu).
  - Token Status: `completed` (hijau), `in-progress` (biru), `not-started` (abu-abu), `cancelled` (merah), `overdue` (merah tua).

### 3. Progressive Web App (PWA)
- Installable di **Windows (Chrome/Edge)**, **Android (Chrome)**, dan **iOS (Safari "Add to Home Screen")** tanpa perlu melalui Google Play Store atau Apple App Store.
- Manifest PWA lengkap (`manifest.json`) dengan icon resolusi 192x192 dan 512x512.
- Dukungan *Service Worker* (`sw.js`) untuk offline caching.

### 4. Sistem Aktivasi Lisensi & Multi-Device (Maksimal 3 Perangkat)
- **Model Aktivasi Kode Unik**: Pengguna mengaktivasi akun menggunakan kode berformat `NARA-XXXX-XXXX-XXXX` tanpa repot mengingat password.
- **Karakter Anti-Ambigu**: Kode digenerate hanya dengan karakter yang jelas (tanpa `0`, `O`, `1`, `I`, `L`).
- **Device Fingerprinting Client**: Mendeteksi fingerprint unik dan nama perangkat (contoh: *"Chrome di Windows"*, *"Safari di iPhone"*).
- **Aturan Multi-Device**:
  1. Kode baru (*unused*): Membuat workspace otomatis dan mendaftarkan perangkat pertama.
  2. Kode aktif: Maksimal **3 perangkat** per lisensi secara bersamaan.
  3. Perangkat ke-4 otomatis **ditolak** dengan pesan instruksi yang jelas.
  4. Halaman **Kelola Perangkat** (`/dashboard/settings/devices`) memungkinkan siswa menghapus perangkat lama untuk membuka slot perangkat baru.
- **Session Aman**: Menggunakan cookie `httpOnly` `nara_session` dan dilindungi oleh `middleware.ts`.

---

## 🗄️ Skema Database Supabase

File migrasi database SQL tersedia di folder `supabase/migrations/`:
1. `0001_init.sql`:
   - Table `workspaces`: Multi-tenant workspace per siswa/tim.
   - Table `profiles`: Profil pengguna dengan role `admin`, `pembina`, `siswa`.
   - Row Level Security (RLS) & Helper Function `get_my_workspace_id()`.
2. `0002_licensing.sql`:
   - Table `license_codes`: Menyimpan kode, paket langganan (`yearly_launching` / `yearly_normal`), status, dan masa berlaku 1 tahun.
   - Table `device_sessions`: Menyimpan `device_id`, `device_name`, dan `last_active_at`.
   - Table `sessions`: Session token terenkripsi untuk autentikasi cookie custom.

---

## 🚀 Panduan Menjalankan Aplikasi

### Persyaratan Sistem
- Node.js versi 18+ (disarankan Node.js 20 atau 22)
- npm

### 1. Salin Konfigurasi Environment
```bash
cp .env.example .env.local
```

Isi konfigurasi pada file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ADMIN_SECRET_KEY=nara-admin-secret-2026
```

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi di browser pada: [http://localhost:3000](http://localhost:3000)

### 3. Generate Kode Lisensi (Admin API)
Admin/Bintang dapat membuat kode lisensi baru dengan mengirimkan HTTP POST:
```bash
curl -X POST http://localhost:3000/api/admin/generate-code \
  -H "Content-Type: application/json" \
  -H "x-admin-key: nara-admin-secret-2026" \
  -d '{"plan": "yearly_launching", "price_paid": 150000}'
```

### 4. Menjalankan Tes Otomatis
Untuk memverifikasi alur aktivasi, batasan 3 perangkat, dan penghapusan perangkat:
```bash
node scripts/verify-licensing.js
```

---

## 🦊 Struktur Folder Proyek

```
c:/NARA APP/
├── public/
│   ├── branding/           # Aset master logo & karakter sheet Nara
│   ├── icons/              # PWA App Icons (192x192, 512x512)
│   ├── mascot/             # Ilustrasi pose maskot (idle, focus, dsb)
│   ├── manifest.json       # Konfigurasi PWA
│   └── sw.js               # Service Worker PWA
├── src/
│   ├── app/
│   │   ├── activate/       # Halaman utama aktivasi kode lisensi
│   │   ├── api/
│   │   │   ├── activate/   # Endpoint aktivasi lisensi & perangkat
│   │   │   ├── admin/      # Endpoint generate kode rahasia admin
│   │   │   ├── auth/       # Endpoint logout
│   │   │   └── devices/    # Endpoint kelola & hapus sesi perangkat
│   │   ├── dashboard/      # Halaman utama siswa & kelola perangkat
│   │   ├── layout.tsx      # Root Layout Next.js (Inter font, PWA, Theme)
│   │   ├── loading.tsx     # Loading state global dengan maskot sleep
│   │   ├── error.tsx       # Error boundary dengan maskot error
│   │   └── globals.css     # CSS Variables & Tailwind Base
│   ├── components/
│   │   ├── NaraMascot.tsx  # Komponen maskot 6 pose + SVG silhouette
│   │   ├── NaraBubble.tsx  # Komponen balon percakapan Nara
│   │   ├── ThemeProvider.tsx # Dark/Light/System mode provider
│   │   └── ThemeToggle.tsx # Tombol toggle tema
│   ├── lib/
│   │   ├── db/             # Data access layer (Supabase + Local fallback)
│   │   ├── device-fingerprint.ts # Deteksi fingerprint & nama perangkat
│   │   └── license-generator.ts  # Algoritma kode unik NARA-XXXX-XXXX-XXXX
│   └── middleware.ts       # Proteksi route /dashboard via cookie session
├── supabase/
│   └── migrations/         # SQL Migrations Supabase
├── scripts/
│   └── verify-licensing.js # Script verifikasi otomatis
└── tailwind.config.ts      # Definisi token warna 3 lapis
```

---

## 🔒 Kebijakan & Prinsip Desain
1. **Zero-AI API Cost**: Seluruh algoritma dan alur logika berjalan murni menggunakan kode TypeScript standar tanpa memanggil model AI berbayar.
2. **Multi-Tenant Ready**: Skema database dirancang dari hari pertama untuk mendukung ribuan siswa dengan isolasi data berbasis workspace.
3. **PWA First**: Dapat diinstal langsung dari browser tanpa perantara app store.
