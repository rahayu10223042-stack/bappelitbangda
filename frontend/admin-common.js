// =========================================================
// BAPPELITBANGDA — Kode bersama untuk semua halaman admin
// (login, cek kunci admin, logout, helper fetch)
// Dipakai oleh: admin-login.html, admin.html, admin-ajuan.html
// =========================================================
const API_BASE = 'http://localhost:4000'; // SESUAIKAN bila backend beda host
const TOKEN_STORAGE = 'bplb_admin_token';

function showToast(message){
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

function getAdminToken(){
  return localStorage.getItem(TOKEN_STORAGE);
}

function authHeaders(extra){
  const token = getAdminToken();
  return Object.assign(
    token ? { 'Authorization': `Bearer ${token}` } : {},
    extra || {}
  );
}

function handleAuthFailure(){
  localStorage.removeItem(TOKEN_STORAGE);
  window.location.href = 'admin-login.html';
}

// =========================================================
// HALAMAN LOGIN (hanya berjalan kalau ada #adminLoginForm)
// =========================================================
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
  if (getAdminToken()) {
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

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memeriksa...';

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Username atau password salah.');
      }
      if (!response.ok) {
        throw new Error('Tidak dapat terhubung ke server. Coba lagi.');
      }

      const result = await response.json();
      if (!result.success || !result.token) {
        throw new Error(result.message || 'Username atau password salah.');
      }

      localStorage.setItem(TOKEN_STORAGE, result.token);
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
  if (!getAdminToken()) {
    window.location.href = 'admin-login.html';
  }
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_STORAGE);
    window.location.href = 'admin-login.html';
  });
}