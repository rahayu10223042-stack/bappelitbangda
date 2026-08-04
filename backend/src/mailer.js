const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Kirim email konfirmasi ajuan berhasil dikirim, berisi nomor tiket/registrasi.
 * Tidak melempar error ke pemanggil — kalau gagal kirim, cukup dicatat di log,
 * supaya proses submit form tetap berhasil walau emailnya gagal terkirim.
 */
async function sendTicketEmail({ to, nama, nomorTiket, jenisLayanan, catatanTambahan }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Mailer] EMAIL_USER / EMAIL_APP_PASSWORD belum diisi di .env, email tidak dikirim.');
    return;
  }

  const fromName = process.env.EMAIL_FROM_NAME || 'Bappelitbangda Kabupaten Tasikmalaya';

  const html = `
    <div style="font-family:sans-serif; max-width:520px; margin:0 auto; padding:24px; border:1px solid #dbe8f9; border-radius:12px;">
      <h2 style="color:#0a3868; margin:0 0 12px;">Ajuan Anda Telah Diterima</h2>
      <p>Yth. <strong>${nama}</strong>,</p>
      <p>Terima kasih, ajuan <strong>${jenisLayanan}</strong> Anda telah kami terima dan sedang menunggu proses verifikasi.</p>
      <div style="background:#f4f9ff; border:1px dashed #1c72d6; border-radius:10px; padding:16px 20px; margin:20px 0; text-align:center;">
        <div style="font-size:0.8rem; color:#51637a; margin-bottom:6px;">Nomor Tiket / Registrasi Anda</div>
        <div style="font-family:monospace; font-size:1.2rem; font-weight:700; color:#135caf;">${nomorTiket}</div>
      </div>
      <p>Simpan nomor ini untuk memantau status ajuan Anda melalui halaman <strong>Cek Status</strong> di situs kami.</p>
      ${catatanTambahan ? `<p style="color:#51637a; font-size:0.9rem;">${catatanTambahan}</p>` : ''}
      <hr style="border:none; border-top:1px solid #dbe8f9; margin:24px 0;">
      <p style="font-size:0.8rem; color:#51637a;">
        Email ini dikirim otomatis oleh sistem layanan Bappelitbangda Kabupaten Tasikmalaya.
        Mohon tidak membalas email ini.
      </p>
    </div>
  `;

  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Konfirmasi Ajuan ${jenisLayanan} — ${nomorTiket}`,
      html,
    });
    console.log(`[Mailer] Email tiket terkirim ke ${to} (${nomorTiket})`);
  } catch (err) {
    console.error('[Mailer] Gagal kirim email:', err.message);
  }
}

module.exports = { sendTicketEmail };