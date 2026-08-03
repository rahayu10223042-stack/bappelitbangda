// =========================================================
// scripts/test-login.js  (sekali pakai buat debugging)
//
// Cara pakai:
//   node scripts/test-login.js
//
// Ini langsung ngecek ke database dan bandingin password
// pakai bcrypt, PERSIS seperti yang dilakukan admin-auth.js,
// tapi tanpa lewat HTTP/browser sama sekali.
// =========================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

// ⚠️ GANTI SESUAI YANG MAU DITES
const USERNAME = 'admin';
const PASSWORD = 'kominfo123';

async function main() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE username = ?',
      [USERNAME],
    );

    if (!rows.length) {
      console.log(`❌ Username "${USERNAME}" TIDAK DITEMUKAN di tabel admin_users.`);
      return;
    }

    const user = rows[0];
    console.log('✅ Username ditemukan. Data user:', {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      password_hash: user.password_hash,
    });

    const cocok = await bcrypt.compare(PASSWORD, user.password_hash);
    console.log(`\nHasil bcrypt.compare("${PASSWORD}", password_hash):`, cocok ? '✅ COCOK' : '❌ TIDAK COCOK');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();