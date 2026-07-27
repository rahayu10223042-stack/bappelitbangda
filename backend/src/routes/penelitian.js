const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { uploadFileToDrive, appendRowToSheet } = require('../googleClient');

const router = express.Router();

// File disimpan sementara di memori, lalu diteruskan ke Google Drive
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'ktp') {
      // KTP boleh PDF atau gambar
      if (file.mimetype !== 'application/pdf' && !file.mimetype.startsWith('image/')) {
        return cb(new Error('Scan KTP harus berformat PDF atau gambar.'));
      }
    } else {
      // proposal & suratPengantar wajib PDF
      if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Proposal dan surat pengantar harus berformat PDF.'));
      }
    }
    cb(null, true);
  },
});

const REQUIRED_FIELDS = [
  'nama', 'nik', 'instansi', 'hp', 'email',
  'judul', 'lokasi', 'mulai', 'selesai',
];

function buildTicketNumber() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TSM-LIT-${yyyymm}-${random}`;
}

// POST /api/penelitian — kirim ajuan izin penelitian baru
router.post(
  '/',
  upload.fields([
    { name: 'proposal', maxCount: 1 },
    { name: 'suratPengantar', maxCount: 1 },
    { name: 'ktp', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const missing = REQUIRED_FIELDS.filter((f) => !req.body[f]);
      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: `Field wajib belum diisi: ${missing.join(', ')}`,
        });
      }

      const files = req.files || {};
      if (!files.proposal || !files.suratPengantar || !files.ktp) {
        return res.status(400).json({
          success: false,
          message: 'Proposal, surat pengantar, dan scan KTP wajib diunggah.',
        });
      }

      const {
        nama, nik, instansi, hp, email,
        judul, lokasi, mulai, selesai, catatan,
      } = req.body;

      if (new Date(selesai) < new Date(mulai)) {
        return res.status(400).json({
          success: false,
          message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
        });
      }

      // Upload ketiga file ke Google Drive (jika integrasi aktif)
      async function uploadOne(fileArr, label) {
        if (!fileArr || !fileArr[0]) return null;
        const file = fileArr[0];
        try {
          return await uploadFileToDrive({
            buffer: file.buffer,
            filename: `${Date.now()}_${label}_${nama.replace(/\s+/g, '_')}_${file.originalname}`,
            mimeType: file.mimetype,
          });
        } catch (err) {
          console.error(`[Drive] Gagal upload ${label}:`, err.message);
          return null;
        }
      }

      const proposalUrl = await uploadOne(files.proposal, 'proposal');
      const suratUrl = await uploadOne(files.suratPengantar, 'surat');
      const ktpUrl = await uploadOne(files.ktp, 'ktp');

      const ticketNumber = buildTicketNumber();

      const [result] = await pool.query(
        `INSERT INTO penelitian
          (ticket_number, nama_peneliti, instansi, nim_nip, judul_penelitian,
           lokasi_penelitian, no_hp, email, tanggal_mulai, tanggal_selesai,
           proposal_url, surat_pengantar_url, ktp_url, catatan, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi')`,
        [ticketNumber, nama, instansi, nik, judul, lokasi, hp, email,
          mulai, selesai, proposalUrl, suratUrl, ktpUrl, catatan || null],
      );

      try {
        await appendRowToSheet([
          ticketNumber, nama, instansi, nik, judul, lokasi, hp, email,
          mulai, selesai, proposalUrl || '', suratUrl || '', ktpUrl || '',
          catatan || '', 'Menunggu Verifikasi',
        ]);
      } catch (err) {
        console.error('[Sheets] Gagal menulis ke spreadsheet:', err.message);
      }

      res.status(201).json({
        success: true,
        message: 'Ajuan izin penelitian berhasil dikirim.',
        ticketNumber,
        id: result.insertId,
      });
    } catch (err) {
      console.error('[POST /api/penelitian] Error:', err);
      res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
  },
);

// GET /api/penelitian/status/:ticketNumber — cek status (publik)
router.get('/status/:ticketNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ticket_number, nama_peneliti, judul_penelitian, status, catatan, created_at, updated_at
       FROM penelitian WHERE ticket_number = ?`,
      [req.params.ticketNumber],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nomor tiket tidak ditemukan.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/penelitian/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;