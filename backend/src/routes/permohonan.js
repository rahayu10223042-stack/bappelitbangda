// =========================================================
// src/routes/permohonan.js  (BARU)
// Rute PUBLIK — Layanan Permohonan dan Informasi
// (mencakup: Permohonan Informasi, Pengaduan, Konsultasi)
//
// Daftarkan di server.js dengan:
//   app.use('/api/permohonan', require('./src/routes/permohonan'));
// =========================================================
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const REQUIRED_FIELDS = ['namaPemohon', 'noHp', 'email', 'jenisLayanan', 'uraian'];
const VALID_JENIS_LAYANAN = ['Permohonan Informasi', 'Pengaduan', 'Konsultasi'];

function buildNomorRegistrasi() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TSM-INF-${yyyymm}-${random}`;
}

// POST /api/permohonan — kirim permohonan informasi/pengaduan/konsultasi
router.post('/', async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Field wajib belum diisi: ${missing.join(', ')}`,
      });
    }

    const { namaPemohon, instansi, noHp, email, jenisLayanan, uraian } = req.body;

    if (!VALID_JENIS_LAYANAN.includes(jenisLayanan)) {
      return res.status(400).json({
        success: false,
        message: `Jenis layanan tidak valid. Gunakan salah satu: ${VALID_JENIS_LAYANAN.join(', ')}`,
      });
    }

    const nomorRegistrasi = buildNomorRegistrasi();
    const tanggal = new Date().toISOString().slice(0, 10);

    const [result] = await pool.query(
      `INSERT INTO permohonan_informasi
        (nomor_registrasi, tanggal, nama_pemohon, instansi, no_hp, email, jenis_layanan, uraian, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')`,
      [nomorRegistrasi, tanggal, namaPemohon, instansi || null, noHp, email, jenisLayanan, uraian],
    );

    res.status(201).json({
      success: true,
      message: 'Permohonan berhasil dikirim.',
      nomorRegistrasi,
      id: result.insertId,
    });
  } catch (err) {
    console.error('[POST /api/permohonan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/permohonan/status/:nomorRegistrasi — cek status
router.get('/status/:nomorRegistrasi', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT nomor_registrasi, jenis_layanan, nama_pemohon, status, created_at, updated_at
       FROM permohonan_informasi WHERE nomor_registrasi = ?`,
      [req.params.nomorRegistrasi],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nomor registrasi tidak ditemukan.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/permohonan/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;