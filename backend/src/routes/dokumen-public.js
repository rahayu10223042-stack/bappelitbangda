// =========================================================
// src/routes/dokumen-public.js  (BARU)
//
// Route PUBLIK (tanpa X-Admin-Key) supaya halaman alur.html dan
// maklumat.html bisa link langsung ke file yang diunggah admin,
// tanpa perlu tahu nama file/ekstensi persisnya (auto redirect).
//
// Daftarkan di server.js:
//   app.use('/api/dokumen', require('./src/routes/dokumen-public'));
//   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// =========================================================
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const META_PATH = path.join(__dirname, '../data/dokumen-meta.json');

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// GET /api/dokumen/:jenis — redirect ke file PDF/dokumen terbaru
router.get('/:jenis', (req, res) => {
  const meta = readMeta();
  const item = meta[req.params.jenis];

  if (!item || !item.fileName) {
    return res.status(404).json({ success: false, message: 'Dokumen belum tersedia.' });
  }

  res.redirect(`/uploads/dokumen/${item.fileName}`);
});

module.exports = router;
