// =========================================================
// src/middleware/requireAdminAuth.js  (BARU)
// Menggantikan requireAdminKey — verifikasi token JWT hasil login
// (username + password), bukan lagi 1 kunci statis di .env.
// =========================================================
const jwt = require('jsonwebtoken');

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Silakan login terlebih dahulu.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, username, namaLengkap }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Sesi login sudah tidak valid atau kedaluwarsa. Silakan login ulang.',
    });
  }
}

module.exports = { requireAdminAuth };