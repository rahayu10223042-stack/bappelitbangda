// =========================================================
// Middleware: Autentikasi Admin menggunakan X-Admin-Key
//
// Mendukung KEDUA nama env var (ADMIN_API_KEY atau ADMIN_KEY —
// dipakai salah satu, mana yang ada di .env akan otomatis dipakai)
// dan KEDUA nama fungsi (requireAdminKey / authenticateAdmin),
// supaya file mana pun yang meng-import tetap jalan.
// =========================================================
const ADMIN_KEY =
  process.env.ADMIN_API_KEY ||
  process.env.ADMIN_KEY ||
  'default-admin-key-change-me';

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'];

  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Admin Key tidak valid.',
    });
  }

  next();
}

module.exports = {
  requireAdminKey,
  authenticateAdmin: requireAdminKey, // alias, biar file lama yang pakai nama ini tetap jalan
};