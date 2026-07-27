const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const router = express.Router();

const TOKEN_PATH = path.resolve(__dirname, '../../credentials/google-oauth-token.json');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

// GET /api/auth/google — buka ini di browser untuk mulai proses izin
router.get('/google', (req, res) => {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // wajib, supaya dapat refresh_token
    prompt: 'consent',      // wajib, supaya refresh_token selalu dikirim ulang
    scope: [
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  res.redirect(url);
});

// GET /api/auth/google/callback — Google akan redirect ke sini setelah Anda klik "Izinkan"
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Tidak ada kode otorisasi dari Google. Coba ulangi dari /api/auth/google');
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // Simpan token (terutama refresh_token) ke file lokal
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    res.send(`
      <div style="font-family:sans-serif; padding:40px; text-align:center;">
        <h2 style="color:#1F9D6C;">✅ Berhasil terhubung ke Google Drive!</h2>
        <p>Token sudah disimpan. Anda bisa menutup tab ini dan kembali ke aplikasi.</p>
      </div>
    `);
  } catch (err) {
    console.error('[OAuth Callback] Error:', err.message);
    res.status(500).send('Gagal menukar kode otorisasi. Cek terminal backend untuk detail error.');
  }
});

module.exports = router;