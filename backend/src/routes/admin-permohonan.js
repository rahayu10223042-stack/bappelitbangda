// =========================================================
// src/routes/admin-permohonan.js
// Rute ADMIN — kelola Layanan Permohonan Informasi, Pengaduan, Konsultasi
//
// Mendukung jenisLayanan sebagai satu nilai ATAU beberapa nilai
// dipisah koma, contoh:
//   ?jenisLayanan=Permohonan Informasi
//   ?jenisLayanan=Pengaduan,Konsultasi
// =========================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

router.use(requireAdminAuth);

const VALID_STATUS = ['Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai'];

// GET /api/admin/permohonan?status=&jenisLayanan=&search=&page=&limit=
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
    if (status) { where.push('status = ?'); params.push(status); }

    if (jenisLayanan) {
      // dukung satu atau beberapa nilai dipisah koma
      const jenisList = jenisLayanan.split(',').map((j) => j.trim()).filter(Boolean);
      if (jenisList.length === 1) {
        where.push('jenis_layanan = ?');
        params.push(jenisList[0]);
      } else if (jenisList.length > 1) {
        where.push(`jenis_layanan IN (${jenisList.map(() => '?').join(',')})`);
        params.push(...jenisList);
      }
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM permohonan ${whereSQL}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT * FROM permohonan ${whereSQL}
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
      'SELECT status FROM permohonan WHERE id = ? FOR UPDATE',
      [req.params.id],
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
    }
    const statusLama = rows[0].status;

    await conn.query(
      'UPDATE permohonan SET status = ?, catatan = ? WHERE id = ?',
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

// GET /api/admin/permohonan/ringkasan?jenisLayanan= — statistik untuk dashboard
// (jenisLayanan opsional, sama seperti di atas: satu nilai atau dipisah koma)
router.get('/ringkasan', async (req, res) => {
  try {
    const { jenisLayanan = '' } = req.query;
    const where = [];
    const params = [];

    if (jenisLayanan) {
      const jenisList = jenisLayanan.split(',').map((j) => j.trim()).filter(Boolean);
      if (jenisList.length === 1) {
        where.push('jenis_layanan = ?');
        params.push(jenisList[0]);
      } else if (jenisList.length > 1) {
        where.push(`jenis_layanan IN (${jenisList.map(() => '?').join(',')})`);
        params.push(...jenisList);
      }
    }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

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
      FROM permohonan ${whereSQL}
    `, params);
    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[GET /api/admin/permohonan/ringkasan] Error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat ringkasan.' });
  }
});

module.exports = router;