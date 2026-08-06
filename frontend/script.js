// =========================================================
// BAPPELITBANGDA — shared interactivity across all pages
// =========================================================

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Sticky header shadow on scroll
const header = document.querySelector('header.site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

// Toast helper
function showToast(message){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

// Scroll reveal animation
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ==========================================================
// Cek Status — GET {API_BASE}/api/ajuan/status/:tiket
// Sesuaikan path ini dengan route backend Anda yang sebenarnya.
// ==========================================================
const statusForm = document.getElementById('statusForm');
if (statusForm) {
  const statusResult = document.getElementById('statusResult');
  const statusTicketLabel = document.getElementById('statusTicketLabel');
  const statusValue = document.getElementById('statusValue');
  const statusNote = document.getElementById('statusNote');
  const statusBtn = statusForm.querySelector('button[type="submit"]');

  statusForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const tiket = statusForm.tiket.value.trim();
    if (!tiket) {
      showToast('Masukkan nomor tiket terlebih dahulu.');
      return;
    }

    const originalLabel = statusBtn.textContent;
    statusBtn.disabled = true;
    statusBtn.textContent = 'Mencari...';

    try {
      let response = await fetch(`${API_BASE}/api/ajuan/status/${encodeURIComponent(tiket)}`);
      let result = await response.json();
      let sourceLabel = 'Magang/PKL';

      // Kalau tidak ketemu di Magang/PKL, coba cek di Izin Penelitian
      if (!response.ok || !result.success) {
        response = await fetch(`${API_BASE}/api/penelitian/status/${encodeURIComponent(tiket)}`);
        result = await response.json();
        sourceLabel = 'Izin Penelitian';
      }

      // Kalau masih belum ketemu, coba cek di Permohonan Informasi
      if (!response.ok || !result.success) {
        response = await fetch(`${API_BASE}/api/permohonan/status/${encodeURIComponent(tiket)}`);
        result = await response.json();
        sourceLabel = 'Permohonan Informasi';
      }

      // Kalau masih belum ketemu, coba cek di Konsultasi/Pengaduan
      if (!response.ok || !result.success) {
        response = await fetch(`${API_BASE}/api/konsultasi-pengaduan/status/${encodeURIComponent(tiket)}`);
        result = await response.json();
        sourceLabel = 'Konsultasi/Pengaduan';
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Nomor tiket tidak ditemukan.');
      }

      const data = result.data || result;
      statusTicketLabel.textContent = `Tiket: ${tiket} (${sourceLabel})`;
      statusValue.textContent = data.status || '—';
      statusNote.textContent = data.catatan || '';
      statusResult.classList.add('show');
      statusResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan. Coba lagi beberapa saat.');
    } finally {
      statusBtn.disabled = false;
      statusBtn.textContent = originalLabel;
    }
  });
}

// ==========================================================
// Form Izin Penelitian — POST {API_BASE}/api/penelitian
// ==========================================================
const penelitianForm = document.getElementById('penelitianForm');
if (penelitianForm) {
  const resultPanelP = document.getElementById('resultPanelPenelitian');
  const ticketNumberP = document.getElementById('ticketNumberPenelitian');
  const submitBtnP = penelitianForm.querySelector('button[type="submit"]');

  penelitianForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!penelitianForm.checkValidity()) {
      penelitianForm.reportValidity();
      return;
    }

    const mulai = new Date(penelitianForm.mulai.value);
    const selesai = new Date(penelitianForm.selesai.value);
    if (selesai < mulai) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    const originalLabel = submitBtnP.textContent;
    submitBtnP.disabled = true;
    submitBtnP.textContent = 'Mengirim...';

    try {
      const formData = new FormData(penelitianForm);

      const response = await fetch(`${API_BASE}/api/penelitian`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengirim ajuan.');
      }

      ticketNumberP.textContent = result.ticketNumber;
      resultPanelP.classList.add('show');
      resultPanelP.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('Ajuan izin penelitian berhasil dikirim.');
      penelitianForm.reset();

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan. Coba lagi beberapa saat. (Pastikan server backend aktif di ' + API_BASE + ')');
    } finally {
      submitBtnP.disabled = false;
      submitBtnP.textContent = originalLabel;
    }
  });
}

// ==========================================================
// Form submit handling — terhubung ke backend (Express + MySQL
// + Google Sheets/Drive). Ubah API_BASE bila backend di-hosting
// terpisah dari file frontend ini, misal:
// const API_BASE = 'https://api.bappelitbangda-tasikmalaya.go.id';
// ==========================================================
const API_BASE = 'http://localhost:4000';

// ==========================================================
// Form Permohonan Informasi & Konsultasi/Pengaduan
// permohonan-informasi.html -> POST {API_BASE}/api/permohonan
// konsultasi-pengaduan.html -> POST {API_BASE}/api/konsultasi-pengaduan
// (2 endpoint & tabel terpisah — keduanya share ID resultPanel/
// ticketDisplay yang sama, tapi di halaman masing-masing)
// ==========================================================
function bindPermohonanForm(formId, endpointPath) {
  const formEl = document.getElementById(formId);
  if (!formEl) return;

  const resultPanelEl = document.getElementById('resultPanel');
  const ticketDisplayEl = document.getElementById('ticketDisplay');
  const submitBtnEl = formEl.querySelector('button[type="submit"]');

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    const originalLabel = submitBtnEl.textContent;
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = 'Mengirim...';

    try {
      const formData = new FormData(formEl);

      const response = await fetch(`${API_BASE}${endpointPath}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengirim ajuan.');
      }

      if (ticketDisplayEl) ticketDisplayEl.textContent = result.ticketNumber;
      if (resultPanelEl) {
        resultPanelEl.classList.add('show');
        resultPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast('Permohonan berhasil dikirim.');
      formEl.reset();

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan. Coba lagi beberapa saat. (Pastikan server backend aktif di ' + API_BASE + ')');
    } finally {
      submitBtnEl.disabled = false;
      submitBtnEl.textContent = originalLabel;
    }
  });
}

bindPermohonanForm('permohonanForm', '/api/permohonan');            // permohonan-informasi.html
bindPermohonanForm('konsultasiForm', '/api/konsultasi-pengaduan');  // konsultasi-pengaduan.html

const form = document.getElementById('ajuanForm');
if (form) {
  const resultPanel = document.getElementById('resultPanel');
  const ticketNumber = document.getElementById('ticketNumber');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const mulai = new Date(form.mulai.value);
    const selesai = new Date(form.selesai.value);
    if (selesai < mulai) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    try {
      const formData = new FormData(form);

      const response = await fetch(`${API_BASE}/api/ajuan`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengirim ajuan.');
      }

      ticketNumber.textContent = result.ticketNumber;
      resultPanel.classList.add('show');
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('Ajuan berhasil dikirim.');
      form.reset();

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan. Coba lagi beberapa saat. (Pastikan server backend aktif di ' + API_BASE + ')');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

// Dropdown menu navigasi ("Ajuan Layanan")
document.querySelectorAll('.nav-dropdown-toggle').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const parent = btn.closest('.nav-dropdown');
    const isOpen = parent.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-dropdown.open').forEach((el) => el.classList.remove('open'));
});