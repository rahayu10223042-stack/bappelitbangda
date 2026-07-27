const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { uploadFileToDrive, appendRowToSheet } = require('../googleClient');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Surat pengantar harus berformat PDF.'));
    }
    cb(null, true);
  },
});

const REQUIRED_FIELDS = [
  'jenis', 'nama', 'nim', 'instansi', 'jurusan',
  'hp', 'email', 'mulai', 'selesai', 'bidang',
];

function buildTicketNumber(jenis) {
  const kode = jenis === 'PKL' ? 'PKL' : 'MG';
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TSM-${kode}-${yyyymm}-${random}`;
}

// POST /api/ajuan — kirim ajuan baru (multipart/form-data)
router.post('/', upload.single('suratPengantar'), async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Field wajib belum diisi: ${missing.join(', ')}`,
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Surat pengantar (PDF) wajib diunggah.',
      });
    }

    const {
      jenis, nama, nim, instansi, jurusan,
      hp, email, mulai, selesai, bidang, catatan,
    } = req.body;

    if (new Date(selesai) < new Date(mulai)) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
      });
    }

    let suratUrl = null;
    try {
      suratUrl = await uploadFileToDrive({
        buffer: req.file.buffer,
        filename: `${Date.now()}_${nama.replace(/\s+/g, '_')}_${req.file.originalname}`,
        mimeType: req.file.mimetype,
      });
    } catch (err) {
      console.error('[Drive] Gagal upload file:', err.message);
    }

    const ticketNumber = buildTicketNumber(jenis);

    const [result] = await pool.query(
      `INSERT INTO ajuan
        (ticket_number, jenis, nama_lengkap, nim_nisn, instansi, program_studi,
         no_hp, email, tanggal_mulai, tanggal_selesai, bidang_tujuan,
         surat_pengantar_url, catatan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')`,
      [ticketNumber, jenis, nama, nim, instansi, jurusan,
        hp, email, mulai, selesai, bidang, suratUrl, catatan || null],
    );

    try {
      await appendRowToSheet([
        ticketNumber, jenis, nama, nim, instansi, jurusan,
        hp, email, mulai, selesai, bidang, suratUrl || '',
        catatan || '', 'Menunggu Verifikasi',
      ]);
    } catch (err) {
      console.error('[Sheets] Gagal menulis ke spreadsheet:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Ajuan berhasil dikirim.',
      ticketNumber,
      id: result.insertId,
    });
  } catch (err) {
    console.error('[POST /api/ajuan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/ajuan/status/:ticketNumber — cek status (publik)
router.get('/status/:ticketNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ticket_number, jenis, nama_lengkap, status, catatan, created_at, updated_at
       FROM ajuan WHERE ticket_number = ?`,
      [req.params.ticketNumber],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nomor tiket tidak ditemukan.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/ajuan/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;