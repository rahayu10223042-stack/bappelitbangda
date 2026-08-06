// =========================================================
// src/routes/admin-konsultasi-pengaduan.js
// Rute ADMIN — Layanan Konsultasi & Pengaduan
// (Terpisah dari admin-permohonan.js, tabel sendiri: konsultasi_pengaduan)
//
// Daftarkan di server.js dengan:
//   app.use('/api/admin/konsultasi-pengaduan', require('./src/routes/admin-konsultasi-pengaduan'));
// =========================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

router.use(requireAdminAuth);

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// GET /api/admin/konsultasi-pengaduan
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', jenisLayanan = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = [];
    const params = [];

    if (search) {
      where.push('(ticket_number LIKE ? OR nama_pemohon LIKE ? OR instansi LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (jenisLayanan) {
      where.push('jenis_layanan = ?');
      params.push(jenisLayanan);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM konsultasi_pengaduan ${whereSQL}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM konsultasi_pengaduan ${whereSQL}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/konsultasi-pengaduan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat data.' });
  }
});

// PATCH /api/admin/konsultasi-pengaduan/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status, catatanAdmin } = req.body;

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status tidak valid. Gunakan: ${VALID_STATUS.join(', ')}`,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT status FROM konsultasi_pengaduan WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }

    const statusLama = rows[0].status;

    await conn.query(
      'UPDATE konsultasi_pengaduan SET status = ?, catatan = ? WHERE id = ?',
      [status, catatanAdmin || null, req.params.id]
    );

    await conn.query(
      `INSERT INTO konsultasi_pengaduan_status_log (konsultasi_pengaduan_id, status_lama, status_baru, catatan_admin)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, statusLama, status, catatanAdmin || null]
    );

    await conn.commit();
    res.json({ success: true, message: 'Status berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    console.error('[PATCH /api/admin/konsultasi-pengaduan/:id/status] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status.' });
  } finally {
    conn.release();
  }
});

// GET /api/admin/konsultasi-pengaduan/ringkasan
router.get('/ringkasan', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(jenis_layanan = 'Konsultasi') AS konsultasi,
        SUM(jenis_layanan = 'Pengaduan') AS pengaduan,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai
      FROM konsultasi_pengaduan
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/konsultasi-pengaduan/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat ringkasan.' });
  }
});

module.exports = router;