// =========================================================
// src/routes/admin-permohonan.js
// =========================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

router.use(requireAdminAuth);

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// GET /api/admin/permohonan
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
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

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM permohonan ${whereSQL}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM permohonan ${whereSQL}
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
    console.error('[GET /api/admin/permohonan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat data.' });
  }
});

// PATCH /api/admin/permohonan/:id/status
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
      'SELECT status FROM permohonan WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }

    const statusLama = rows[0].status;

    await conn.query(
      'UPDATE permohonan SET status = ?, catatan = ? WHERE id = ?',
      [status, catatanAdmin || null, req.params.id]
    );

    await conn.query(
      `INSERT INTO permohonan_status_log (permohonan_id, status_lama, status_baru, catatan_admin)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, statusLama, status, catatanAdmin || null]
    );

    await conn.commit();
    res.json({ success: true, message: 'Status berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    console.error('[PATCH /api/admin/permohonan/:id/status] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status.' });
  } finally {
    conn.release();
  }
});

// GET /api/admin/permohonan/ringkasan
router.get('/ringkasan', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai
      FROM permohonan
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/permohonan/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat ringkasan.' });
  }
});

module.exports = router;