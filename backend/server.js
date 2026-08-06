require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./src/db');
const ajuanRoutes = require('./src/routes/ajuan');
const adminRoutes = require('./src/routes/admin');
const dokumenRoutes = require('./src/routes/dokumen');
const dokumenPublicRoutes = require('./src/routes/dokumen-public');
const penelitianRoutes = require('./src/routes/penelitian');
const adminPenelitianRoutes = require('./src/routes/admin-penelitian');
const authGoogleRoutes = require('./src/routes/auth-google');
const permohonanRoutes = require('./src/routes/permohonan');
const adminPermohonanRoutes = require('./src/routes/admin-permohonan');
const adminAuthRoutes = require('./src/routes/admin-auth');
const konsultasiPengaduanRoutes = require('./src/routes/konsultasi-pengaduan');
const adminKonsultasiPengaduanRoutes = require('./src/routes/admin-konsultasi-pengaduan');

const app = express();

// PENTING: kalau frontend dibuka dari beberapa alamat berbeda saat
// development (Live Server, file://, dll), sebaiknya izinkan semua
// dulu (`origin: '*'`) supaya tidak diblokir CORS. Persempit lagi ke
// domain asli saat sudah live/production.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supaya file yang diunggah admin (PDF/dokumen) bisa diakses lewat URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend layanan Magang & PKL aktif.' });
});

app.use('/api/ajuan', ajuanRoutes);
// PENTING: /api/admin/auth harus didaftar SEBELUM /api/admin, karena
// Express mencocokkan berdasarkan awalan path. Kalau /api/admin
// didaftar duluan dan router-nya punya middleware pengecekan token
// global, request ke /api/admin/auth/login ikut tersaring middleware
// itu duluan sebelum sempat sampai ke route login yang sebenarnya.
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/dokumen', dokumenRoutes);
app.use('/api/dokumen', dokumenPublicRoutes); // akses publik: GET /api/dokumen/alur, /api/dokumen/maklumat
app.use('/api/penelitian', penelitianRoutes); // publik: kirim ajuan & cek status izin penelitian
app.use('/api/admin/penelitian', adminPenelitianRoutes); // admin: kelola izin penelitian
app.use('/api/auth', authGoogleRoutes);
app.use('/api/permohonan', permohonanRoutes); // publik: kirim permohonan & cek status
app.use('/api/admin/permohonan', adminPermohonanRoutes);
app.use('/api/konsultasi-pengaduan', konsultasiPengaduanRoutes); // publik: kirim konsultasi/pengaduan & cek status
app.use('/api/admin/konsultasi-pengaduan', adminKonsultasiPengaduanRoutes);

// Penanganan error umum (mis. file bukan PDF, ukuran file terlalu besar dari multer)
app.use((err, req, res, next) => {
  if (err) {
    console.error('[Error Handler]', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`[Server] Backend berjalan di http://localhost:${PORT}`);
  await testConnection();
});