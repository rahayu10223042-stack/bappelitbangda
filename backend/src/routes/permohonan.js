// =========================================================
// src/routes/permohonan.js
// Rute PUBLIK — Layanan Permohonan Data dan Informasi
// (Konsultasi & Pengaduan sekarang punya route+tabel terpisah,
//  lihat src/routes/konsultasi-pengaduan.js)
//
// Daftarkan di server.js dengan:
//   app.use('/api/permohonan', require('./src/routes/permohonan'));
// =========================================================
const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { uploadFileToDrive, appendRowToSheet } = require('../googleClient');
const { sendTicketEmail } = require('../mailer');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('File harus berformat PDF, JPG, atau PNG.'));
    }
    cb(null, true);
  },
});

// 2 slot file: fileKtp (wajib), fileSuratKuasa (opsional)
const uploadFields = upload.fields([
  { name: 'fileKtp', maxCount: 1 },
  { name: 'fileSuratKuasa', maxCount: 1 },
]);

const REQUIRED_FIELDS = [
  'namaPemohon', 'noHp', 'email', 'uraian',
  'nik', 'pekerjaan', 'alamat', 'jenisData', 'caraMemperoleh', 'bentukSalinan', 'tujuanPenggunaan',
];

function buildTicketNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TSM-PDI-${yyyymm}-${random}`;
}

// POST /api/permohonan — kirim permohonan informasi (multipart/form-data)
router.post('/', (req, res) => {
  uploadFields(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message =
        uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran file maksimal 2MB.'
          : uploadErr.message || 'Gagal mengunggah file.';
      return res.status(400).json({ success: false, message });
    }

    try {
      const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: `Field wajib belum diisi: ${missing.join(', ')}`,
        });
      }

      const {
        namaPemohon, instansi, noHp, email, uraian,
        nik, pekerjaan, alamat, jenisData, caraMemperoleh, bentukSalinan, tujuanPenggunaan,
      } = req.body;

      if (!req.files || !req.files.fileKtp) {
        return res.status(400).json({
          success: false,
          message: 'Upload KTP/Identitas wajib untuk Permohonan Informasi.',
        });
      }

      // Upload file ke Google Drive
      let fileKtpUrl = null;
      let fileSuratKuasaUrl = null;

      const fileKtp = req.files.fileKtp[0];
      try {
        fileKtpUrl = await uploadFileToDrive({
          buffer: fileKtp.buffer,
          filename: `${Date.now()}_${namaPemohon.replace(/\s+/g, '_')}_KTP_${fileKtp.originalname}`,
          mimeType: fileKtp.mimetype,
        });
      } catch (err) {
        console.error('[Drive] Gagal upload KTP:', err.message);
      }

      const fileSuratKuasa = req.files?.fileSuratKuasa?.[0];
      if (fileSuratKuasa) {
        try {
          fileSuratKuasaUrl = await uploadFileToDrive({
            buffer: fileSuratKuasa.buffer,
            filename: `${Date.now()}_${namaPemohon.replace(/\s+/g, '_')}_SuratKuasa_${fileSuratKuasa.originalname}`,
            mimeType: fileSuratKuasa.mimetype,
          });
        } catch (err) {
          console.error('[Drive] Gagal upload Surat Kuasa:', err.message);
        }
      }

      const ticketNumber = buildTicketNumber();

      const [result] = await pool.query(
        `INSERT INTO permohonan
          (ticket_number, jenis_layanan, nama_pemohon, nik, pekerjaan, instansi, alamat,
           no_hp, email, jenis_data, cara_memperoleh, bentuk_salinan, tujuan_penggunaan,
           uraian, file_ktp_url, file_surat_kuasa_url, status)
         VALUES (?, 'Permohonan Informasi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')`,
        [
          ticketNumber, namaPemohon, nik, pekerjaan, instansi || null, alamat,
          noHp, email, jenisData, caraMemperoleh, bentukSalinan, tujuanPenggunaan,
          uraian, fileKtpUrl, fileSuratKuasaUrl,
        ],
      );

      try {
        await appendRowToSheet([
          ticketNumber, namaPemohon, nik, pekerjaan, instansi || '', alamat,
          noHp, email, jenisData, caraMemperoleh, bentukSalinan, tujuanPenggunaan,
          uraian, fileKtpUrl || '', fileSuratKuasaUrl || '', 'Menunggu Verifikasi',
        ]);
      } catch (err) {
        console.error('[Sheets] Gagal menulis ke spreadsheet:', err.message);
      }

      sendTicketEmail({
        to: email,
        nama: namaPemohon,
        nomorTiket: ticketNumber,
        jenisLayanan: 'Permohonan Informasi',
      });

      res.status(201).json({
        success: true,
        message: 'Permohonan berhasil dikirim.',
        ticketNumber,
        id: result.insertId,
      });
    } catch (err) {
      console.error('[POST /api/permohonan] Error:', err);
      res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
  });
});

// GET /api/permohonan/status/:ticketNumber — cek status (publik)
router.get('/status/:ticketNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ticket_number, jenis_layanan, nama_pemohon, status, catatan, created_at, updated_at
       FROM permohonan WHERE ticket_number = ?`,
      [req.params.ticketNumber],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nomor tiket tidak ditemukan.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/permohonan/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;