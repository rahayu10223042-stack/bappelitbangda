const express = require('express');
const { pool } = require('../db');
const { requireAdminKey } = require('../middleware/auth');

const router = express.Router();

// Semua route di bawah ini wajib menyertakan header X-Admin-Key
router.use(requireAdminKey);

// GET /api/admin/ajuan?status=&jenis=&search=&page=&limit=
router.get('/ajuan', async (req, res) => {
  try {
    const { status, jenis, search } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (status) { where.push('status = ?'); params.push(status); }
    if (jenis) { where.push('jenis = ?'); params.push(jenis); }
    if (search) {
      where.push('(nama_lengkap LIKE ? OR ticket_number LIKE ? OR instansi LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT * FROM ajuan ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ajuan ${whereSql}`,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/admin/ajuan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/ajuan/:id — detail satu ajuan
router.get('/ajuan/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ajuan WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/admin/ajuan/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// PATCH /api/admin/ajuan/:id/status — ubah status ajuan
router.patch('/ajuan/:id/status', async (req, res) => {
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

    const [rows] = await conn.query('SELECT status FROM ajuan WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    const statusLama = rows[0].status;

    await conn.query('UPDATE ajuan SET status = ? WHERE id = ?', [status, req.params.id]);
    await conn.query(
      `INSERT INTO ajuan_status_log (ajuan_id, status_lama, status_baru, catatan_admin)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, statusLama, status, catatanAdmin || null],
    );

    await conn.commit();
    res.json({ success: true, message: 'Status berhasil diperbarui.' });
  } catch (err) {
    await conn.rollback();
    console.error('[PATCH /api/admin/ajuan/:id/status] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/admin/ajuan/:id
router.delete('/ajuan/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM ajuan WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data ajuan berhasil dihapus.' });
  } catch (err) {
    console.error('[DELETE /api/admin/ajuan/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/berita-acara — rekap otomatis per bulan
router.get('/berita-acara', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS bulan,
        SUM(jenis = 'Magang') AS jumlah_magang,
        SUM(jenis = 'PKL') AS jumlah_pkl,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai,
        COUNT(*) AS total
      FROM ajuan
      GROUP BY bulan
      ORDER BY bulan DESC
      LIMIT 12
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /api/admin/berita-acara] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/ringkasan — statistik singkat untuk dashboard
// PENTING: bentuknya FLAT (bukan nested {ajuan, penelitian, ...}),
// karena admin-dashboard.js membaca langsung data.total, data.menunggu, dst.
// Statistik khusus Penelitian ada di endpoint terpisah:
// GET /api/admin/penelitian/ringkasan (lihat routes/admin-penelitian.js)
router.get('/ringkasan', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai,
        SUM(jenis = 'Magang') AS total_magang,
        SUM(jenis = 'PKL') AS total_pkl
      FROM ajuan
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;