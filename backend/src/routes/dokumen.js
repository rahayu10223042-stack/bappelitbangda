const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdminKey } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdminKey);

// Folder tujuan: backend/uploads/dokumen (dilayani publik via /uploads, lihat server.js)
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/dokumen');

// Jenis dokumen yang dikenal situs publik
const KNOWN_JENIS = ['alur', 'maklumat'];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cari file yang sudah ada untuk jenis tertentu, apapun ekstensinya
// (mis. alur.pdf, alur.docx, alur.png — hanya boleh ada 1 per jenis)
function findExistingFile(jenis) {
  const files = fs.readdirSync(UPLOAD_DIR);
  return files.find((f) => path.parse(f).name === jenis) || null;
}

function removeExistingFile(jenis) {
  const existing = findExistingFile(jenis);
  if (existing) {
    fs.unlinkSync(path.join(UPLOAD_DIR, existing));
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const jenis = req.params.jenis;
    if (!KNOWN_JENIS.includes(jenis)) {
      return cb(new Error('Jenis dokumen tidak dikenali.'));
    }
    // Hapus file lama (ekstensi apapun) sebelum menyimpan yang baru,
    // supaya tidak ada dua file untuk jenis yang sama.
    removeExistingFile(jenis);
    const ext = path.extname(file.originalname);
    cb(null, `${jenis}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB, format bebas
});

// GET /api/admin/dokumen — status dokumen saat ini
router.get('/', (req, res) => {
  const data = KNOWN_JENIS.map((jenis) => {
    const fileName = findExistingFile(jenis);
    const exists = Boolean(fileName);
    const stat = exists ? fs.statSync(path.join(UPLOAD_DIR, fileName)) : null;
    return {
      jenis,
      fileName: fileName || null,
      exists,
      updatedAt: stat ? stat.mtime : null,
      sizeKb: stat ? Math.round(stat.size / 1024) : null,
    };
  });
  res.json({ success: true, data });
});

// POST /api/admin/dokumen/:jenis — upload/ganti dokumen (format bebas)
router.post('/:jenis', (req, res) => {
  if (!KNOWN_JENIS.includes(req.params.jenis)) {
    return res.status(400).json({
      success: false,
      message: 'Jenis dokumen tidak valid. Gunakan "alur" atau "maklumat".',
    });
  }

  const single = upload.single('file');
  single(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File wajib diunggah.' });
    }
    res.json({
      success: true,
      message: 'Dokumen berhasil diunggah dan menggantikan versi sebelumnya.',
      fileName: req.file.filename,
    });
  });
});

module.exports = router;