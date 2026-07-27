// =========================================================
// Utility: Generate nomor tiket unik untuk setiap layanan
// =========================================================
const pool = require('../db');

const TICKET_PREFIX = {
  'MAGANG': 'BPLB-MG',
  'PKL': 'BPLB-PKL',
  'PENELITIAN': 'BPLB-RISET'
};

async function generateTicket(layanan) {
  const prefix = TICKET_PREFIX[layanan] || 'BPLB';
  const year = new Date().getFullYear();
  
  // Tentukan tabel berdasarkan layanan
  let tableName = 'ajuan';
  if (layanan === 'PENELITIAN') {
    tableName = 'penelitian';
  }
  
  const [rows] = await pool.query(
    `SELECT ticket_number FROM ${tableName} 
     WHERE ticket_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}-${year}-%`]
  );
  
  let sequence = 1;
  if (rows.length > 0) {
    const lastTicket = rows[0].ticket_number;
    const lastSeq = parseInt(lastTicket.split('-').pop(), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  // Format: BPLB-MG-2026-000123
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

module.exports = { generateTicket };