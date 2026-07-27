// =========================================================
// TAMBAHAN untuk src/routes/admin.js Anda.
//
// Cara pakai: tempel route di bawah ini ke admin.js Anda,
// DI ATAS baris `module.exports = router;` paling akhir.
// Tidak perlu import tambahan — sudah pakai `pool` yang
// sudah ada di file itu.
// =========================================================

// GET /api/admin/berita-acara — rekap jumlah ajuan per bulan (12 bulan terakhir)
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
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY bulan
      ORDER BY bulan DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /api/admin/berita-acara] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});
