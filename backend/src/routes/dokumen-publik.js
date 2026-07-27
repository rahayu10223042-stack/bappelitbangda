const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/dokumen');
const KNOWN_JENIS = ['alur', 'maklumat'];

function findExistingFile(jenis) {
  if (!fs.existsSync(UPLOAD_DIR)) return null;
  const files = fs.readdirSync(UPLOAD_DIR);
  return files.find((f) => path.parse(f).name === jenis) || null;
}

// GET /api/dokumen/:jenis — buka/unduh dokumen (dipanggil tombol "Buka Dokumen" di alur.html / maklumat.html)
router.get('/:jenis', (req, res) => {
  const jenis = req.params.jenis;

  if (!KNOWN_JENIS.includes(jenis)) {
    return res.status(400).json({ success: false, message: 'Jenis dokumen tidak valid.' });
  }

  const fileName = findExistingFile(jenis);
  if (!fileName) {
    return res.status(404).json({
      success: false,
      message: 'Dokumen belum diunggah oleh admin. Silakan cek kembali nanti.',
    });
  }

  const filePath = path.join(UPLOAD_DIR, fileName);
  res.sendFile(filePath);
});

module.exports = router;