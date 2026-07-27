// =========================================================
// BAPPELITBANGDA — Khusus halaman admin.html (Dashboard)
// Butuh admin-common.js dimuat lebih dulu.
// =========================================================
const statTotalEl = document.getElementById('statTotal');

if (statTotalEl) {

  // ---------- Kartu statistik ----------
  async function loadStats(){
    try {
      const response = await fetch(`${API_BASE}/api/admin/ringkasan`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) return handleAuthFailure();
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      const d = result.data || {};
      document.getElementById('statTotal').textContent = d.total ?? '—';
      document.getElementById('statPending').textContent = d.menunggu ?? '—';
      document.getElementById('statApproved').textContent = d.diverifikasi ?? '—';
      document.getElementById('statDone').textContent = d.selesai ?? '—';
    } catch (err) {
      console.error(err);
    }
  }

  // ---------- Berita Acara (rekap bulanan) ----------
  const beritaAcaraBody = document.getElementById('beritaAcaraBody');
  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  function formatBulan(yyyyMm){
    const [year, month] = yyyyMm.split('-');
    return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
  }

  async function loadBeritaAcara(){
    if (!beritaAcaraBody) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/berita-acara`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) return handleAuthFailure();
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      renderBeritaAcara(result.data || []);
    } catch (err) {
      console.error(err);
      beritaAcaraBody.innerHTML = `<tr><td colspan="8" style="padding:16px; color:#B42318;">Gagal memuat rekap Berita Acara. Pastikan endpoint /api/admin/berita-acara sudah ada di backend.</td></tr>`;
    }
  }

  function renderBeritaAcara(rows){
    if (!rows.length) {
      beritaAcaraBody.innerHTML = `<tr><td colspan="8" style="padding:16px; color:var(--ink-soft);">Belum ada data ajuan untuk direkap.</td></tr>`;
      return;
    }

    beritaAcaraBody.innerHTML = rows.map(row => `
      <tr>
        <td>${formatBulan(row.bulan)}</td>
        <td>${row.jumlah_magang}</td>
        <td>${row.jumlah_pkl}</td>
        <td>${row.menunggu}</td>
        <td>${row.diverifikasi}</td>
        <td>${row.ditolak}</td>
        <td>${row.selesai}</td>
        <td style="font-weight:700; color:var(--blue-950);">${row.total}</td>
      </tr>
    `).join('');
  }

  // ---------- Kelola Dokumen (Alur Layanan & Maklumat Pelayanan) ----------
  const dokumenGrid = document.getElementById('dokumenGrid');
  const DOKUMEN_LABEL = {
    alur: 'Bagan Alur Layanan',
    maklumat: 'Maklumat Pelayanan',
  };

  async function loadDokumen(){
    if (!dokumenGrid) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/dokumen`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) return handleAuthFailure();
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      renderDokumen(result.data);
    } catch (err) {
      console.error(err);
      dokumenGrid.innerHTML = `<p style="color:#B42318;">Gagal memuat status dokumen. Pastikan endpoint /api/admin/dokumen sudah ada di backend.</p>`;
    }
  }

  function renderDokumen(items){
    dokumenGrid.innerHTML = items.map(item => `
      <div class="doc-slot-card">
        <div class="doc-slot-title">${DOKUMEN_LABEL[item.jenis] || item.jenis}</div>
        <div class="doc-slot-status">
          ${item.exists
            ? `Status: <strong class="ok">Sudah ada</strong> &middot; ${item.fileName || ''} &middot; ${item.sizeKb} KB &middot; diperbarui ${new Date(item.updatedAt).toLocaleString('id-ID')}`
            : `Status: <strong class="missing">Belum ada file</strong>`}
        </div>
        <input type="file" id="fileInput-${item.jenis}">
        <button type="button" class="btn btn-solid" data-jenis="${item.jenis}" data-action="upload-dokumen">
          ${item.exists ? 'Ganti File' : 'Unggah File'}
        </button>
      </div>
    `).join('');

    dokumenGrid.querySelectorAll('[data-action="upload-dokumen"]').forEach(btn => {
      btn.addEventListener('click', () => uploadDokumen(btn.dataset.jenis, btn));
    });
  }

  async function uploadDokumen(jenis, btnEl){
    const fileInput = document.getElementById(`fileInput-${jenis}`);
    const file = fileInput.files[0];

    if (!file) {
      showToast('Pilih file terlebih dahulu.');
      return;
    }
    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      showToast(`Ukuran file maksimal ${maxSizeMb} MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const originalText = btnEl.textContent;
    btnEl.disabled = true;
    btnEl.textContent = 'Mengunggah...';

    try {
      const response = await fetch(`${API_BASE}/api/admin/dokumen/${jenis}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      if (response.status === 401 || response.status === 403) return handleAuthFailure();

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengunggah dokumen.');
      }

      showToast(`${DOKUMEN_LABEL[jenis]} berhasil diperbarui.`);
      loadDokumen();

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal mengunggah dokumen.');
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = originalText;
    }
  }

  // Panggil semua fungsi pemuat data
  loadStats();
  loadBeritaAcara();
  loadDokumen();
}