# Serah Terima — Sistem Layanan Magang, PKL & Izin Penelitian
### Bappelitbangda Kabupaten Tasikmalaya

Dokumen ini adalah panduan serah terima source code dari pengembang (Kerja Praktik) kepada tim infrastruktur/Kominfo untuk keperluan deployment ke server production.

---

## 1. Gambaran Umum Sistem

Sistem ini melayani 2 jenis pengajuan secara daring:
1. **Magang / Praktik Kerja Lapangan (PKL)**
2. **Izin Penelitian**

Terdiri dari 2 bagian utama:
- **Frontend** — halaman publik (form pengajuan, cek status, info layanan) + panel admin, berupa HTML/CSS/JS statis (tidak butuh Node.js untuk menjalankan, cukup di-host sebagai file statis).
- **Backend** — REST API (Node.js + Express.js) yang menangani penyimpanan data ke MySQL, upload berkas, dan autentikasi admin.

---

## 2. Struktur Folder yang Diserahkan

```
frontend/
├── index.html              (Beranda)
├── pengajuan.html           (Form Magang/PKL)
├── penelitian.html          (Form Izin Penelitian)
├── cek-status.html
├── alur.html
├── maklumat.html
├── admin-login.html
├── admin.html                (Dashboard admin)
├── admin-ajuan.html          (Kelola data Magang/PKL)
├── admin-penelitian.html     (Kelola data Izin Penelitian)
├── style.css
├── script.js
├── admin-common.js
├── admin-dashboard.js
├── admin-ajuan.js
├── admin-penelitian.js
└── assets/, img/             (aset pendukung)

backend/
├── server.js
├── package.json
├── schema.sql                 (skema database lengkap — WAJIB dijalankan sebelum start server)
├── src/
│   ├── db.js                  (koneksi MySQL)
│   ├── middleware/
│   │   └── auth.js            (autentikasi admin)
│   └── routes/
│       ├── ajuan.js           (publik: Magang/PKL)
│       ├── admin.js           (admin: Magang/PKL + ringkasan + berita acara)
│       ├── penelitian.js      (publik: Izin Penelitian)
│       ├── admin-penelitian.js (admin: Izin Penelitian)
│       ├── dokumen.js         (admin: kelola dokumen layanan publik)
│       └── dokumen-public.js  (publik: akses dokumen layanan)
└── .env.example                (⚠️ isi env production baru, JANGAN pakai .env development)
```

> **Catatan:** folder `node_modules/` dan file `.env` milik development **sengaja tidak diikutsertakan**. Kredensial (database, admin key) harus dibuat baru khusus untuk production oleh tim yang mengelola server.

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

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=<diisi_admin_server>
DB_PASSWORD=<diisi_admin_server>
DB_NAME=bappelitbangda_pkl
ADMIN_API_KEY=<buat_kunci_baru_yang_kuat_dan_acak>
FRONTEND_ORIGIN=<domain_asli_frontend, contoh: https://layanan.tasikmalayakab.go.id>
ENABLE_GOOGLE_INTEGRATION=false
```

> ⚠️ **Penting:** `ADMIN_API_KEY` adalah satu-satunya kunci masuk ke panel admin. Jangan gunakan nilai contoh/development. Buat string acak yang panjang (minimal 20 karakter), dan simpan hanya oleh pihak yang berwenang mengelola sistem ini di Bappelitbangda (bukan di Kominfo, karena Kominfo hanya mengelola infrastruktur/server, bukan operasional harian aplikasi).

Setup database:

```bash
mysql -u root -p < schema.sql
```

Jalankan server:

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

Port `4000` (Node) **tidak perlu dibuka ke publik** — cukup diakses dari localhost server, diteruskan lewat Nginx.

---

## 6. Daftar Endpoint API

### Publik (tanpa autentikasi)

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/ajuan` | Kirim ajuan Magang/PKL (multipart, field `suratPengantar`) |
| GET | `/api/ajuan/status/:ticket` | Cek status ajuan Magang/PKL |
| POST | `/api/penelitian` | Kirim ajuan Izin Penelitian (multipart: `proposal`, `suratPengantar`, `ktp`) |
| GET | `/api/penelitian/status/:ticket` | Cek status ajuan Izin Penelitian |
| GET | `/api/dokumen/:jenis` | Redirect ke file dokumen layanan (`alur` / `maklumat`) |
| GET | `/api/health` | Cek server aktif |

### Admin (wajib header `X-Admin-Key`)

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

---

## 7. Status Integrasi Google (Drive/Sheets)

Saat ini `ENABLE_GOOGLE_INTEGRATION=false` — berkas yang diunggah (surat pengantar, proposal, KTP) **belum tersimpan ke Google Drive**, dan rekap **belum otomatis tercatat ke Google Sheets**. Ini fitur opsional yang bisa diaktifkan nanti apabila dibutuhkan, dengan menyiapkan:
- Google Cloud Service Account + file kredensial JSON
- Google Drive API & Google Sheets API di-*enable* pada project tersebut

Selama fitur ini nonaktif, berkas yang diunggah pengguna disimpan lokal di folder `uploads/` pada server — **pastikan folder ini ikut di-backup rutin**.

---

## 8. Yang Perlu Dibackup Rutin

- Database MySQL (`bappelitbangda_pkl`) — disarankan `mysqldump` harian otomatis via cron.
- Folder `backend/uploads/` — berisi berkas dokumen layanan publik yang diunggah admin.

---

## 9. Pembagian Tanggung Jawab

| Pihak | Tanggung Jawab |
|---|---|
| **Kominfo** | Infrastruktur server, domain, SSL, reverse proxy, backup server, keamanan jaringan |
| **Bappelitbangda (Umpeg)** | Pemegang Admin Key, operasional harian (verifikasi ajuan, kelola dokumen layanan), pelaporan Berita Acara |
| **Pengembang (Kerja Praktik)** | Source code, dokumentasi ini, tidak lagi memegang kredensial production setelah serah terima |

---

*Dokumen ini disusun sebagai bagian dari serah terima hasil Kerja Praktik pengembangan backend sistem informasi layanan Magang, PKL, dan Izin Penelitian di Bappelitbangda Kabupaten Tasikmalaya.*
