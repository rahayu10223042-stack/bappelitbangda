const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const ENABLED = String(process.env.ENABLE_GOOGLE_INTEGRATION).toLowerCase() === 'true';
const TOKEN_PATH = path.resolve(__dirname, '../credentials/google-oauth-token.json');

let sheetsClient = null;
let driveOAuthClient = null;

// ===== Sheets tetap pakai Service Account (tidak masalah untuk tulis baris) =====
function getServiceAccountAuth() {
  const keyFile = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  if (!ENABLED) return null;
  if (sheetsClient) return sheetsClient;
  const auth = getServiceAccountAuth();
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// ===== Drive pakai OAuth (akun Gmail asli, hasil dari /api/auth/google) =====
function getDriveOAuthClient() {
  if (driveOAuthClient) return driveOAuthClient;

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      'Belum ada izin akses Google Drive. Buka http://localhost:4000/api/auth/google di browser terlebih dahulu.',
    );
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
  oauth2Client.setCredentials(tokens);

  // Simpan ulang otomatis kalau Google mengeluarkan access_token baru
  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  driveOAuthClient = oauth2Client;
  return driveOAuthClient;
}

/**
 * Upload buffer file ke Google Drive memakai akun Gmail asli (OAuth),
 * bukan Service Account — supaya tidak kena error "no storage quota".
 */
async function uploadFileToDrive({ buffer, filename, mimeType }) {
  if (!ENABLED) return null;

  const auth = getDriveOAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const { Readable } = require('stream');
  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return file.data.webViewLink;
}

async function appendRowToSheet(rowValues) {
  if (!ENABLED) return;
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: process.env.GOOGLE_SHEET_RANGE || 'Ajuan!A:N',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] },
  });
}

module.exports = {
  ENABLED,
  uploadFileToDrive,
  appendRowToSheet,
};