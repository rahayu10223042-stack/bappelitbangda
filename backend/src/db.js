const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Uji koneksi saat server pertama kali dijalankan
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`[DB] Terkoneksi ke MySQL "${process.env.DB_NAME}" di ${process.env.DB_HOST}`);
    conn.release();
  } catch (err) {
    console.error('[DB] Gagal konek ke MySQL:', err.message);
    console.error('     Pastikan schema.sql sudah dijalankan dan kredensial di .env benar.');
  }
}

module.exports = { pool, testConnection };