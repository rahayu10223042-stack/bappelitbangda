// =========================================================
// BAPPELITBANGDA — Public Route: Layanan Penelitian / SKP
// =========================================================
const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../db');
const { generateTicket } = require('../services/ticketGenerator');

// Konfigurasi upload sementara
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diizinkan'), false);
    }
  }
});

// POST: Submit penelitian baru
router.post('/', upload.fields([
  { name: 'suratPengantar', maxCount: 1 },
  { name: 'proposal', maxCount: 1 }
]), async (req, res) => {
  let connection;
  
  try {
    const {
      nama, nim, instansi, jurusan, hp, email,
      judul, tujuan, lokasi, dosen,
      mulai, selesai, catatan
    } = req.body;

    // Validasi tanggal
    if (new Date(selesai) < new Date(mulai)) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
      });
    }

    // Generate ticket number
    const ticketNumber = await generateTicket('PENELITIAN');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Simpan path file sementara (nanti bisa diintegrasikan dengan Google Drive)
    let suratPath = null;
    let proposalPath = null;
    
    if (req.files?.suratPengantar) {
      suratPath = req.files.suratPengantar[0].path;
    }
    if (req.files?.proposal) {
      proposalPath = req.files.proposal[0].path;
    }

    // Insert ke database
    const [result] = await connection.query(
      `INSERT INTO penelitian (
        ticket_number, nama_lengkap, nim_nisn, instansi, program_studi,
        no_hp, email, judul_penelitian, tujuan_penelitian, lokasi_penelitian,
        dosen_pembimbing, tanggal_mulai, tanggal_selesai,
        surat_pengantar_url, proposal_url, catatan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketNumber, nama, nim, instansi, jurusan, hp, email,
        judul, tujuan, lokasi, dosen, mulai, selesai,
        suratPath, proposalPath, catatan
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      ticketNumber,
      message: 'Ajuan penelitian berhasil dikirim.'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('[Penelitian] Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengirim ajuan penelitian.'
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET: Cek status penelitian
router.get('/status/:ticket', async (req, res) => {
  try {
    const { ticket } = req.params;
    const [rows] = await pool.query(
      `SELECT ticket_number, status, catatan, updated_at 
       FROM penelitian WHERE ticket_number = ?`,
      [ticket]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Nomor tiket tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      ticketNumber: rows[0].ticket_number,
      status: rows[0].status,
      catatan: rows[0].catatan,
      updatedAt: rows[0].updated_at
    });

  } catch (err) {
    console.error('[Penelitian] Cek status error:', err);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengecek status.'
    });
  }
});

module.exports = router;