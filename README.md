# Serah Terima — Sistem Layanan Magang, PKL & Izin Penelitian
### Bappelitbangda Kabupaten Tasikmalaya

Dokumen ini adalah panduan serah terima source code dari pengembang (Kerja Praktik) kepada tim infrastruktur/Kominfo untuk keperluan deployment ke server production.

---

## 1. Gambaran Umum Sistem

Sistem ini melayani berbagai jenis pengajuan secara daring:
- Magang / Praktik Kerja Lapangan (PKL)
- Izin Penelitian
- Permohonan Data dan Informasi
- Konsultasi dan Pengaduan
- Survey Kepuasan Masyarakat

Terdiri dari 2 bagian utama:
- **Frontend** — halaman publik (form pengajuan, cek status, info layanan) + panel admin, berupa HTML/CSS/JS statis (tidak butuh Node.js untuk menjalankan, cukup di-host sebagai file statis).
- **Backend** — REST API (Node.js + Express.js) yang menangani penyimpanan data ke MySQL, upload berkas, dan autentikasi admin.

**Catatan versi:** Sejak dokumen ini diperbarui, sistem login admin sudah diganti total — dari satu "Admin Key" bersama menjadi **akun admin individual (username + password)** dengan sesi berbasis token (JWT). Lihat Bagian 4 dan 6 untuk detailnya.

---

## 2. Struktur Folder yang Diserahkan

```
frontend/
├── index.html                      (Beranda)
├── alur.html                       (Alur Pengajuan Magang/PKL)
├── maklumat.html                   (Maklumat Pengajuan)
├── cek-status.html                 (Cek Status Pengajuan)
├── pengajuan.html                  (Form Magang/PKL)
├── penelitian.html                 (Form Izin Penelitian)
├── permohonan-informasi.html       (Form Permohonan Data Informasi)
├── konsultasi-pengaduan.html       (Form Konsultasi Pengaduan)
├── admin-login.html                (Login admin — username & password)
├── admin-ganti-password.html       (Ubah Password Admin)
├── admin.html                      (Dashboard admin)
├── admin-ajuan.html                (Kelola Data Magang/PKL)
├── admin-penelitian.html           (Kelola Data Izin Penelitian)
├── admin-permohonan.html           (Kelola Data Permohonan)
├── admin-konsultasi-pengaduan.html (Kelola Data Konsultasi)
├── admin-common.js                 (helper bersama: authHeaders, login, logout)
├── admin-dashboard.js              (Logika Grafik dan Ringkasan Data)
├── admin-ajuan.js                  (Logika Kelola Ajuan Magang/PKL)
├── admin-penelitian.js             (Logika Kelola Izin Penelitian)
├── admin-konsultasi-pengaduan.js   (Logika Kelola Data Konsultasi Pengajuan)
├── admin-permohonan.js             (Logika Kelola Data Permohonan)
├── admin-ganti-password.js         (Validasi Form Ganti Password)
├── style.css                       (Style Tampilan Website)
├── script.js                       (Logika JS umum untuk Halaman Utama)
└── assets/, img/                   (Aset Pendukung)

backend/
├── server.js                       (File Server Backend Utama)
├── package.json                    (Daftar Depensi/library Node.js)
├── schema.sql                      (skema database lengkap WAJIB dijalankan sebelum start server)
├── scripts/
│   ├── create-admin.js             (sekali-jalan: membuat akun admin pertama)
│   └── reset-admin-password.js     (sekali-jalan: reset password akun admin yang lupa)
├── src/
│   ├── db.js                       (koneksi MySQL)
│   ├── middleware/
│   │   └── requireAdminAuth.js     (verifikasi token JWT untuk semua endpoint admin)
│   └── routes/
│       ├── admin.js                        (admin: Magang/PKL + ringkasan + berita acara)
│       ├── admin-penelitian.js             (admin: Izin Penelitian)
│       ├── admin-permohonan.js             (admin: Permohonan Data & Informasi)
│       ├── admin-konsultasi-pengaduan.js   (admin: Konsultasi Pengaduan)
│       ├── admin-auth.js                   (admin: login, cek sesi, ganti password)
│       ├── penelitian.js                   (publik: Izin Penelitian)
│       ├── ajuan.js                        (publik: Magang/PKL)
│       ├── konsultasi-pengaduan.js         (publik: Konsultasi Pengaduan)
│       ├── permohonan.js                   (publik: Permohonan Data & Informasi)
│       ├── auth-google.js                  (Otorisasi Google)
│       ├── dokumen.js                      (admin: kelola dokumen layanan publik)
│       └── dokumen-public.js               (publik: akses dokumen layanan)
└── .env.example                            (⚠️ isi env production baru, JANGAN pakai .env development)
```

**Catatan:** folder `node_modules/` dan file `.env` milik development sengaja tidak diikutsertakan. Kredensial (database, `JWT_SECRET`) harus dibuat baru khusus untuk production oleh tim yang mengelola server. Akun admin (username/password) juga harus dibuat ulang khusus untuk production — jangan pakai akun development.

---

## 3. Kebutuhan Server

| Komponen | Keterangan |
|---|---|
| Node.js | v18 LTS atau v20 LTS |
| MySQL / MariaDB | v8.0 ke atas (atau MariaDB setara) |
| Process manager | PM2 disarankan, supaya server otomatis restart |
| Web server / reverse proxy | Nginx atau Apache, untuk serve frontend statis + proxy `/api/*` ke Node |
| SSL/HTTPS | Let's Encrypt atau sertifikat yang sudah dikelola Kominfo |

---

## 4. Langkah Instalasi Backend

```bash
cd backend
npm install
```

Buat file `.env` baru (lihat `.env.example`) dengan isi:

```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=<diisi_admin_server>
DB_PASSWORD=<diisi_admin_server>
DB_NAME=bappelitbangda_pkl
JWT_SECRET=<buat_string_acak_panjang_dan_rahasia_minimal_32_karakter>
FRONTEND_ORIGIN=<domain_asli_frontend, contoh: https://layanan.tasikmalayakab.go.id>
ENABLE_GOOGLE_INTEGRATION=false
```

⚠️ **Penting:** `JWT_SECRET` dipakai untuk menandatangani sesi login semua admin. Jangan gunakan nilai contoh/development, dan jangan sebar ke pihak yang tidak berwenang — siapa pun yang memegang nilai ini bisa membuat token admin palsu. Buat string acak yang panjang (minimal 32 karakter, bisa pakai generator seperti randomkeygen.com).

**Setup database:**
```bash
mysql -u root -p bappelitbangda_pkl < schema.sql
```
(Pastikan `schema.sql` yang dipakai sudah termasuk tabel `admin_users` — cek dulu isinya sebelum dijalankan.)

**Buat akun admin pertama (WAJIB, sekali saja):**
```bash
node scripts/create-admin.js
```
Sebelum dijalankan, buka file `scripts/create-admin.js`, ganti `USERNAME`, `PASSWORD`, dan `NAMA_LENGKAP` sesuai akun production yang diinginkan. Password ini yang nanti dipakai admin pertama login — **catat baik-baik**, karena setelah dijalankan password langsung ter-hash dan tidak bisa dibaca ulang dari database.

Kalau nanti ada admin lupa password, jalankan `node scripts/reset-admin-password.js` (isi `USERNAME` dan `PASSWORD_BARU` di file itu dulu sebelum dijalankan) — aman dipakai berulang kali kapan pun dibutuhkan.

**Jalankan server:**
```bash
# Untuk tes manual:
node server.js

# Untuk production (tetap jalan di background):
pm2 start server.js --name bappelitbangda-backend
pm2 save
```

---

## 5. Konfigurasi Reverse Proxy (contoh Nginx)

```nginx
server {
    listen 443 ssl;
    server_name layanan.tasikmalayakab.go.id;

    root /var/www/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:4000;
    }
}
```

Port 4000 (Node) tidak perlu dibuka ke publik — cukup diakses dari localhost server, diteruskan lewat Nginx.

---

## 6. Daftar Endpoint API

### Publik (tanpa autentikasi)

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/ajuan` | Kirim ajuan Magang/PKL (multipart, field `suratPengantar`) |
| GET | `/api/ajuan/status/:ticket` | Cek status ajuan Magang/PKL |
| POST | `/api/penelitian` | Kirim ajuan Izin Penelitian (multipart: `proposal`, `suratPengantar`, `ktp`) |
| GET | `/api/penelitian/status/:ticket` | Cek status ajuan Izin Penelitian |
| GET | `/api/dokumen/:jenis` | Redirect ke file dokumen layanan (alur / maklumat) |
| GET | `/api/health` | Cek server aktif |

### Autentikasi Admin

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/admin/auth/login` | Login — body `{ username, password }`, respons berisi `token` |
| GET | `/api/admin/auth/me` | Cek siapa yang sedang login (butuh token) |
| POST | `/api/admin/auth/change-password` | Ganti password — body `{ oldPassword, newPassword }` (butuh token) |

### Admin (wajib header `Authorization: Bearer <token>`)

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/admin/ringkasan` | Statistik ringkas Magang/PKL |
| GET | `/api/admin/ajuan` | Daftar ajuan Magang/PKL (filter, pencarian, paginasi) |
| PATCH | `/api/admin/ajuan/:id/status` | Ubah status ajuan |
| GET | `/api/admin/berita-acara` | Rekap bulanan gabungan |
| GET | `/api/admin/penelitian` | Daftar ajuan Izin Penelitian |
| PATCH | `/api/admin/penelitian/:id/status` | Ubah status ajuan Izin Penelitian |
| GET | `/api/admin/penelitian/ringkasan` | Statistik ringkas Izin Penelitian |
| GET | `/api/admin/dokumen` | Status dokumen layanan publik |
| POST | `/api/admin/dokumen/:jenis` | Upload/ganti dokumen layanan |

**Catatan teknis untuk yang meneruskan/deploy:** di `server.js`, route `/api/admin/auth` harus didaftarkan (`app.use`) **sebelum** route `/api/admin` yang umum. Express mencocokkan path berdasarkan awalan, jadi kalau urutannya terbalik, request ke halaman login bisa ikut tersaring oleh middleware token milik route admin umum, dan login jadi selalu gagal meski username/password benar.

---

## 7. Status Integrasi Google (Drive/Sheets)

Saat ini `ENABLE_GOOGLE_INTEGRATION=false` — berkas yang diunggah (surat pengantar, proposal, KTP) belum tersimpan ke Google Drive, dan rekap belum otomatis tercatat ke Google Sheets. Ini fitur opsional yang bisa diaktifkan nanti apabila dibutuhkan, dengan menyiapkan:
- Google Cloud Service Account + file kredensial JSON
- Google Drive API & Google Sheets API di-enable pada project tersebut

Selama fitur ini nonaktif, berkas yang diunggah pengguna disimpan lokal di folder `uploads/` pada server — pastikan folder ini ikut di-backup rutin.

---

## 8. Yang Perlu Dibackup Rutin

- Database MySQL (`bappelitbangda_pkl`), termasuk tabel `admin_users` — disarankan `mysqldump` harian otomatis via cron.
- Folder `backend/uploads/` — berisi berkas dokumen layanan publik yang diunggah admin.

---

## 9. Pembagian Tanggung Jawab

| Pihak | Tanggung Jawab |
|---|---|
| Kominfo | Infrastruktur server, domain, SSL, reverse proxy, backup server, keamanan jaringan, penyimpanan `JWT_SECRET` production |
| Bappelitbangda (Umpeg) | Pemegang akun admin (username & password), operasional harian (verifikasi ajuan, kelola dokumen layanan), pelaporan Berita Acara |
| Pengembang (Kerja Praktik) | Source code, dokumentasi, tidak lagi memegang kredensial production setelah serah terima |

---

Dokumen ini disusun sebagai bagian dari serah terima hasil Kerja Praktik pengembangan backend dan frontend sistem informasi layanan di Bappelitbangda Kabupaten Tasikmalaya.