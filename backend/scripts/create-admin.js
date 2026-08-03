// =========================================================
// scripts/create-admin.js  (BARU — jalankan SEKALI saja)
//
// Cara pakai:
//   1. Pastikan sudah `npm install bcryptjs` (lihat catatan di bawah)
//   2. Ubah USERNAME, PASSWORD, NAMA_LENGKAP di bawah ini
//   3. Jalankan dari folder backend:  node scripts/create-admin.js
//   4. Kalau berhasil, akun admin pertama langsung bisa dipakai login
//   5. Setelah berhasil, boleh hapus file ini (tidak dibutuhkan lagi
//      kecuali nanti mau bikin akun admin baru lewat cara yang sama)
// =========================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

// ⚠️ GANTI 3 BARIS INI SEBELUM DIJALANKAN
const USERNAME = 'admin';
const PASSWORD = 'kominfo123';
const NAMA_LENGKAP = 'Admin Bappelitbangda';

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  try {
    await pool.query(
      `INSERT INTO admin_users (username, password_hash, nama_lengkap, aktif)
       VALUES (?, ?, ?, 1)`,
      [USERNAME, hash, NAMA_LENGKAP],
    );
    console.log(`✅ Akun admin "${USERNAME}" berhasil dibuat.`);
    console.log('   Silakan login dengan username & password yang barusan Anda atur di file ini.');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error(`❌ Username "${USERNAME}" sudah ada. Pilih username lain atau hapus dulu akun lama di tabel admin_users.`);
    } else {
      console.error('❌ Gagal membuat akun admin:', err.message);
    }
  } finally {
    await pool.end();
  }
}

main();