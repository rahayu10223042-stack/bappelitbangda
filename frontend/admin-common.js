// =========================================================
// BAPPELITBANGDA — Kode bersama untuk semua halaman admin
// (login, cek kunci admin, logout, helper fetch)
// Dipakai oleh: admin-login.html, admin.html, admin-ajuan.html
// =========================================================
const API_BASE = 'http://localhost:4000'; // SESUAIKAN bila backend beda host
const KEY_STORAGE = 'bplb_admin_key';

function showToast(message){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

function getAdminKey(){
  return localStorage.getItem(KEY_STORAGE);
}

function authHeaders(extra){
  return Object.assign({ 'X-Admin-Key': getAdminKey() || '' }, extra || {});
}

function handleAuthFailure(){
  localStorage.removeItem(KEY_STORAGE);
  window.location.href = 'admin-login.html';
}

// =========================================================
// HALAMAN LOGIN (hanya berjalan kalau ada #adminLoginForm)
// =========================================================
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
  if (getAdminKey()) {
    window.location.href = 'admin.html';
  }

  const loginError = document.getElementById('loginError');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginError.classList.remove('show');

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    const key = loginForm.adminKey.value.trim();
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memeriksa...';

    try {
      const response = await fetch(`${API_BASE}/api/admin/ringkasan`, {
        headers: { 'X-Admin-Key': key },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin Key salah atau tidak sah.');
      }
      if (!response.ok) {
        throw new Error('Tidak dapat terhubung ke server. Coba lagi.');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Admin Key salah atau tidak sah.');
      }

      localStorage.setItem(KEY_STORAGE, key);
      window.location.href = 'admin.html';

    } catch (err) {
      console.error(err);
      loginError.textContent = err.message || 'Gagal masuk. Coba lagi.';
      loginError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

// =========================================================
// PENJAGA HALAMAN ADMIN (hanya berjalan kalau ada #logoutBtn,
// artinya ini halaman terproteksi: admin.html / admin-ajuan.html)
// =========================================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  if (!getAdminKey()) {
    window.location.href = 'admin-login.html';
  }
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(KEY_STORAGE);
    window.location.href = 'admin-login.html';
  });
}