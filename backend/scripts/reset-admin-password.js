// =========================================================
// scripts/reset-admin-password.js  (jalankan SEKALI tiap perlu reset)
//
// Cara pakai:
//   1. Ubah USERNAME dan PASSWORD_BARU di bawah ini
//   2. Jalankan dari folder backend:  node scripts/reset-admin-password.js
//   3. Kalau berhasil, langsung bisa login pakai password baru
//   4. Aman dijalankan berulang kali kapan pun lupa password lagi
// =========================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

// ⚠️ GANTI 2 BARIS INI SEBELUM DIJALANKAN
const USERNAME = 'umpeg';
const PASSWORD_BARU = 'bappelitbangda2026';

async function main() {
  const hash = await bcrypt.hash(PASSWORD_BARU, 10);

  try {
    const [result] = await pool.query(
      `UPDATE admin_users SET password_hash = ? WHERE username = ?`,
      [hash, USERNAME],
    );

    if (result.affectedRows === 0) {
      console.error(`❌ Username "${USERNAME}" tidak ditemukan di tabel admin_users.`);
      console.error('   Cek dulu username yang benar, atau jalankan create-admin.js untuk membuat akun baru.');
    } else {
      console.log(`✅ Password untuk akun "${USERNAME}" berhasil direset.`);
      console.log('   Silakan login dengan username & password baru yang barusan Anda atur di file ini.');
    }
  } catch (err) {
    console.error('❌ Gagal reset password:', err.message);
  } finally {
    await pool.end();
  }
}

main();