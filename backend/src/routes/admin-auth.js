// =========================================================
// src/routes/admin-auth.js  (BARU)
// Rute autentikasi admin: login, ganti password, cek sesi.
//
// Daftarkan di server.js dengan:
//   app.use('/api/admin/auth', require('./src/routes/admin-auth'));
//
// Butuh package tambahan: bcryptjs, jsonwebtoken
//   npm install bcryptjs jsonwebtoken
//
// Butuh env var baru di .env:
//   JWT_SECRET=isi_dengan_string_acak_panjang_dan_rahasia
// =========================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

const router = express.Router();

// POST /api/admin/auth/login — { username, password } -> token JWT
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE username = ?',
      [username],
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const user = rows[0];
    const cocok = await bcrypt.compare(password, user.password_hash);

    if (!cocok) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, namaLengkap: user.nama_lengkap },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      admin: { id: user.id, username: user.username, namaLengkap: user.nama_lengkap },
    });
  } catch (err) {
    console.error('[POST /api/admin/auth/login] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

// GET /api/admin/auth/me — info admin yang sedang login (butuh token)
router.get('/me', requireAdminAuth, async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// POST /api/admin/auth/change-password — { oldPassword, newPassword } (butuh token)
router.post('/change-password', requireAdminAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan password baru wajib diisi.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 8 karakter.' });
    }

    const [rows] = await pool.query('SELECT * FROM admin_users WHERE id = ?', [req.admin.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
    }

    const cocok = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!cocok) {
      return res.status(401).json({ success: false, message: 'Password lama tidak sesuai.' });
    }

    const hashBaru = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hashBaru, req.admin.id]);

    res.json({ success: true, message: 'Password berhasil diubah. Silakan login ulang.' });
  } catch (err) {
    console.error('[POST /api/admin/auth/change-password] Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;