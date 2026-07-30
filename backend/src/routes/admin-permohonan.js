// =========================================================
// src/routes/admin-permohonan.js  (BARU)
// Rute ADMIN — kelola Layanan Permohonan dan Informasi
// (mencakup: Permohonan Informasi, Pengaduan, Konsultasi)
//
// Daftarkan di server.js dengan:
//   app.use('/api/admin/permohonan', require('./src/routes/admin-permohonan'));
// =========================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminKey } = require('../middleware/auth');

router.use(requireAdminKey);

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// GET /api/admin/permohonan?status=&jenisLayanan=&search=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', jenisLayanan = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = [];
    const params = [];

    if (search) {
      where.push('(nomor_registrasi LIKE ? OR nama_pemohon LIKE ? OR instansi LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) { where.push('status = ?'); params.push(status); }
    if (jenisLayanan) { where.push('jenis_layanan = ?'); params.push(jenisLayanan); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM permohonan_informasi ${whereSQL}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT * FROM permohonan_informasi ${whereSQL}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
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
    res.status(500).json({ success: false, message: 'Gagal memuat data permohonan.' });
  }
});

// PATCH /api/admin/permohonan/:id/status
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

    const [rows] = await conn.query(
      'SELECT status FROM permohonan_informasi WHERE id = ? FOR UPDATE',
      [req.params.id],
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    const statusLama = rows[0].status;

    await conn.query(
      'UPDATE permohonan_informasi SET status = ?, catatan_admin = ? WHERE id = ?',
      [status, catatanAdmin || null, req.params.id],
    );
    await conn.query(
      `INSERT INTO permohonan_status_log (permohonan_id, status_lama, status_baru, catatan_admin)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, statusLama, status, catatanAdmin || null],
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

// GET /api/admin/permohonan/ringkasan — statistik untuk dashboard
router.get('/ringkasan', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Menunggu Verifikasi') AS menunggu,
        SUM(status = 'Diverifikasi') AS diverifikasi,
        SUM(status = 'Ditolak') AS ditolak,
        SUM(status = 'Selesai') AS selesai,
        SUM(jenis_layanan = 'Permohonan Informasi') AS total_permohonan_informasi,
        SUM(jenis_layanan = 'Pengaduan') AS total_pengaduan,
        SUM(jenis_layanan = 'Konsultasi') AS total_konsultasi
      FROM permohonan_informasi
    `);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/permohonan/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat ringkasan.' });
  }
});

module.exports = router;