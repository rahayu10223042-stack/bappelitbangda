const express = require('express');
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');;

const router = express.Router();
router.use(requireAdminAuth);

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// GET /api/admin/penelitian?status=&search=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (status) { where.push('status = ?'); params.push(status); }
    if (search) {
      where.push('(nama_peneliti LIKE ? OR ticket_number LIKE ? OR judul_penelitian LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT *,
              nama_peneliti AS nama_lengkap,
              nim_nip AS nik
       FROM penelitian ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM penelitian ${whereSql}`,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/admin/penelitian] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/penelitian/ringkasan — statistik untuk dashboard
router.get('/ringkasan', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai
      FROM penelitian
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/penelitian/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/penelitian/:id — detail satu ajuan
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *, nama_peneliti AS nama_lengkap, nim_nip AS nik FROM penelitian WHERE id = ?`,
      [req.params.id],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/admin/penelitian/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// PATCH /api/admin/penelitian/:id/status — ubah status
router.patch('/:id/status', async (req, res) => {
  const { status, catatanAdmin } = req.body;

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status tidak valid. Gunakan salah satu: ${VALID_STATUS.join(', ')}`,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT status FROM penelitian WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    const statusLama = rows[0].status;

    await conn.query('UPDATE penelitian SET status = ? WHERE id = ?', [status, req.params.id]);
    await conn.query(
      `INSERT INTO penelitian_status_log (penelitian_id, status_lama, status_baru, catatan_admin)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, statusLama, status, catatanAdmin || null],
    );

    await conn.commit();
    res.json({ success: true, message: 'Status berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    console.error('[PATCH /api/admin/penelitian/:id/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/admin/penelitian/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM penelitian WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data ajuan penelitian berhasil dihapus.' });
  } catch (err) {
    console.error('[DELETE /api/admin/penelitian/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;