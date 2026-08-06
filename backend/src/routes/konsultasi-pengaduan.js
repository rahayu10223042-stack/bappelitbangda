// =========================================================
// src/routes/konsultasi-pengaduan.js
// Rute PUBLIK — Layanan Konsultasi & Pengaduan
// (dipisah dari Permohonan Informasi, tabel & endpoint sendiri)
//
// Daftarkan di server.js dengan:
//   app.use('/api/konsultasi-pengaduan', require('./src/routes/konsultasi-pengaduan'));
// =========================================================
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const REQUIRED_FIELDS = ['jenisLayanan', 'namaPemohon', 'noHp', 'email', 'uraian'];
const VALID_JENIS_LAYANAN = ['Konsultasi', 'Pengaduan'];

const PREFIX_JENIS_LAYANAN = {
  'Konsultasi': 'KON',
  'Pengaduan': 'PGD',
};

function buildTicketNumber(jenisLayanan) {
  const kode = PREFIX_JENIS_LAYANAN[jenisLayanan] || 'KSP';
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TSM-${kode}-${yyyymm}-${random}`;
}

// POST /api/konsultasi-pengaduan — kirim konsultasi/pengaduan baru
router.post('/', async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Field wajib belum diisi: ${missing.join(', ')}`,
      });
    }

    const { jenisLayanan, namaPemohon, instansi, noHp, email, uraian } = req.body;

    if (!VALID_JENIS_LAYANAN.includes(jenisLayanan)) {
      return res.status(400).json({
        success: false,
        message: `Jenis layanan tidak valid. Gunakan salah satu: ${VALID_JENIS_LAYANAN.join(', ')}`,
      });
    }

    const ticketNumber = buildTicketNumber(jenisLayanan);

    const [result] = await pool.query(
      `INSERT INTO konsultasi_pengaduan
        (ticket_number, jenis_layanan, nama_pemohon, instansi, no_hp, email, uraian, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')`,
      [ticketNumber, jenisLayanan, namaPemohon, instansi || null, noHp, email, uraian],
    );

    res.status(201).json({
      success: true,
      message: 'Ajuan berhasil dikirim.',
      ticketNumber,
      id: result.insertId,
    });
  } catch (err) {
    console.error('[POST /api/konsultasi-pengaduan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/konsultasi-pengaduan/status/:ticketNumber — cek status (publik)
router.get('/status/:ticketNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ticket_number, jenis_layanan, nama_pemohon, status, catatan, created_at, updated_at
       FROM konsultasi_pengaduan WHERE ticket_number = ?`,
      [req.params.ticketNumber],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nomor tiket tidak ditemukan.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/konsultasi-pengaduan/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;