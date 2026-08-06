// =========================================================
// BAPPELITBANGDA — Khusus halaman admin-permohonan.html
// Butuh admin-common.js dimuat lebih dulu.
// =========================================================
const tableBody = document.getElementById('tableBody');

if (tableBody) {

  const emptyState = document.getElementById('emptyState');
  const countBadge = document.getElementById('countBadge');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const jenisFilter = document.getElementById('jenisFilter');
  const pagerEl = document.getElementById('pager');
  const exportBtn = document.getElementById('exportExcelBtn');

  let currentPage = 1;
  const pageLimit = 20;

  const statusMeta = {
    'Menunggu Verifikasi': { cls: 'badge-pending' },
    'Diverifikasi': { cls: 'badge-disetujui' },
    'Ditolak': { cls: 'badge-ditolak' },
    'Selesai': { cls: 'badge-selesai' },
  };

  function rowField(row, key, fallback){
    return row[key] ?? fallback ?? '—';
  }

  function truncate(text, max = 60){
    if (!text) return '—';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  function formatTanggal(value){
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---------- Statistik ----------
  async function loadStats(){
    try {
      const response = await fetch(`${API_BASE}/api/admin/permohonan/ringkasan`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) return handleAuthFailure();
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      const d = result.data || {};
      document.getElementById('statTotalM').textContent = d.total ?? '—';
      document.getElementById('statPendingM').textContent = d.menunggu ?? '—';
      document.getElementById('statApprovedM').textContent = d.diverifikasi ?? '—';
      document.getElementById('statDoneM').textContent = d.selesai ?? '—';
    } catch (err) {
      console.error(err);
    }
  }

  // ---------- Tabel ----------
  function renderRows(rows){
    tableBody.innerHTML = '';

    if (!rows.length) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    rows.forEach(row => {
      const status = row.status || 'Menunggu Verifikasi';
      const meta = statusMeta[status] || { cls: 'badge-pending' };
      const isPending = status === 'Menunggu Verifikasi';
      const isVerified = status === 'Diverifikasi';

      const berkasLinks = [];
      if (row.file_ktp_url) berkasLinks.push(`<a href="${row.file_ktp_url}" target="_blank" rel="noopener">KTP</a>`);
      if (row.file_surat_kuasa_url) berkasLinks.push(`<a href="${row.file_surat_kuasa_url}" target="_blank" rel="noopener">Surat Kuasa</a>`);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="cell-ticket">${rowField(row, 'ticket_number')}</span></td>
        <td>
          <div class="cell-name">${rowField(row, 'nama_pemohon')}</div>
          <div class="cell-sub">${rowField(row, 'instansi', 'Perorangan')} &middot; ${rowField(row, 'email')}</div>
        </td>
        <td>${rowField(row, 'jenis_layanan')}</td>
        <td style="max-width:260px;">${truncate(row.uraian)}</td>
        <td>${formatTanggal(row.created_at)}</td>
        <td><span class="badge ${meta.cls}">${status}</span></td>
        <td>${berkasLinks.length ? berkasLinks.join(' &middot; ') : '<span style="color:var(--ink-soft);">—</span>'}</td>
        <td>
          <div class="action-group">
            <button class="action-btn approve" data-action="Diverifikasi" ${!isPending ? 'disabled' : ''}>Verifikasi</button>
            <button class="action-btn reject" data-action="Ditolak" ${!isPending ? 'disabled' : ''}>Tolak</button>
            <button class="action-btn done" data-action="Selesai" ${!isVerified ? 'disabled' : ''}>Selesai</button>
          </div>
        </td>
      `;

      tr.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => updateStatus(row.id, btn.dataset.action, btn, rowField(row, 'ticket_number')));
      });

      tableBody.appendChild(tr);
    });
  }

  function renderPager(pagination){
    if (!pagerEl) return;
    if (!pagination || pagination.totalPages <= 1) {
      pagerEl.innerHTML = '';
      return;
    }
    pagerEl.innerHTML = `
      <button class="btn btn-outline" id="prevPage" ${pagination.page <= 1 ? 'disabled' : ''}>&larr; Sebelumnya</button>
      <span>Halaman ${pagination.page} dari ${pagination.totalPages}</span>
      <button class="btn btn-outline" id="nextPage" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Berikutnya &rarr;</button>
    `;
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); loadData(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage = currentPage + 1; loadData(); });
  }

  async function updateStatus(id, newStatus, btnEl, ticketLabel){
    let catatanAdmin = null;
    if (newStatus === 'Ditolak') {
      catatanAdmin = window.prompt('Catatan penolakan (opsional):', '') || null;
    }

    const originalText = btnEl.textContent;
    btnEl.disabled = true;
    btnEl.textContent = '...';

    try {
      const response = await fetch(`${API_BASE}/api/admin/permohonan/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus, catatanAdmin }),
      });

      if (response.status === 401 || response.status === 403) return handleAuthFailure();

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal memperbarui status.');
      }

      showToast(`Status ${ticketLabel} diubah menjadi "${newStatus}".`);
      loadStats();
      loadData();

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memperbarui status. Coba lagi.');
      btnEl.disabled = false;
      btnEl.textContent = originalText;
    }
  }

  async function loadData(){
    try {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      if (statusFilter.value) params.set('status', statusFilter.value);
      if (jenisFilter.value) params.set('jenisLayanan', jenisFilter.value);
      params.set('page', currentPage);
      params.set('limit', pageLimit);

      const response = await fetch(`${API_BASE}/api/admin/permohonan?${params.toString()}`, {
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) return handleAuthFailure();

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal memuat data permohonan.');
      }

      const rows = result.data || [];
      countBadge.textContent = `${result.pagination ? result.pagination.total : rows.length} permohonan`;
      renderRows(rows);
      renderPager(result.pagination);

    } catch (err) {
      console.error(err);
      showToast(err.message || `Tidak dapat memuat data. Pastikan backend aktif di ${API_BASE}.`);
      tableBody.innerHTML = '';
      emptyState.style.display = 'block';
    }
  }

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { currentPage = 1; loadData(); }, 350);
  });
  statusFilter.addEventListener('change', () => { currentPage = 1; loadData(); });
  jenisFilter.addEventListener('change', () => { currentPage = 1; loadData(); });

  // ---------- Ekspor ke Excel ----------
  const EXPORT_COLUMNS = [
    ['ticket_number', 'No. Tiket'],
    ['jenis_layanan', 'Jenis Layanan'],
    ['nama_pemohon', 'Nama Pemohon'],
    ['instansi', 'Asal Instansi'],
    ['no_hp', 'No. HP'],
    ['email', 'Email'],
    ['uraian', 'Uraian'],
    ['file_ktp_url', 'Link KTP'],
    ['file_surat_kuasa_url', 'Link Surat Kuasa'],
    ['status', 'Status'],
    ['created_at', 'Waktu Kirim'],
  ];

  async function fetchAllForExport(){
    const EXPORT_PAGE_SIZE = 100;
    let page = 1;
    let totalPages = 1;
    let allRows = [];

    do {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      if (statusFilter.value) params.set('status', statusFilter.value);
      if (jenisFilter.value) params.set('jenisLayanan', jenisFilter.value);
      params.set('page', page);
      params.set('limit', EXPORT_PAGE_SIZE);

      const response = await fetch(`${API_BASE}/api/admin/permohonan?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (response.status === 401 || response.status === 403) return handleAuthFailure();

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengambil data untuk diekspor.');
      }

      allRows = allRows.concat(result.data || []);
      totalPages = result.pagination ? result.pagination.totalPages : 1;
      page += 1;

    } while (page <= totalPages);

    return allRows;
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const originalText = exportBtn.textContent;
      exportBtn.disabled = true;
      exportBtn.textContent = 'Menyiapkan file...';

      try {
        const rows = await fetchAllForExport();

        if (!rows.length) {
          showToast('Tidak ada data untuk diekspor.');
          return;
        }

        const exportRows = rows.map(row => {
          const obj = {};
          EXPORT_COLUMNS.forEach(([key, label]) => {
            obj[label] = row[key] ?? '';
          });
          return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        worksheet['!cols'] = EXPORT_COLUMNS.map(() => ({ wch: 24 }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Permohonan');

        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `data-permohonan-${today}.xlsx`);

        showToast(`Berhasil mengekspor ${rows.length} data.`);

      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal mengekspor data.');
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = originalText;
      }
    });
  }

  loadStats();
  loadData();
}