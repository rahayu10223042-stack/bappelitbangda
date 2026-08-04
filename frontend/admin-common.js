// =========================================================
// BAPPELITBANGDA — Kode bersama untuk semua halaman admin
// (login, cek sesi, logout, helper fetch dengan token)
// Dipakai oleh: admin-login.html, admin.html, admin-ajuan.html,
// admin-penelitian.html, dan halaman admin lain yang menyusul.
// =========================================================
const API_BASE = 'http://localhost:4000'; // SESUAIKAN bila backend beda host
const TOKEN_STORAGE = 'bplb_admin_token';
const ADMIN_INFO_STORAGE = 'bplb_admin_info';

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

function getAdminInfo(){
  try {
    return JSON.parse(localStorage.getItem(ADMIN_INFO_STORAGE) || 'null');
  } catch {
    return null;
  }
}

function authHeaders(extra){
  return Object.assign({ 'Authorization': `Bearer ${getAdminToken() || ''}` }, extra || {});
}

function handleAuthFailure(){
  localStorage.removeItem(TOKEN_STORAGE);
  localStorage.removeItem(ADMIN_INFO_STORAGE);
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Username atau password salah.');
      }

      localStorage.setItem(TOKEN_STORAGE, result.token);
      localStorage.setItem(ADMIN_INFO_STORAGE, JSON.stringify(result.admin));
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
// artinya ini halaman terproteksi: admin.html / admin-ajuan.html / dst)
// =========================================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  if (!getAdminToken()) {
    window.location.href = 'admin-login.html';
  }

  // Tampilkan nama admin yang login, kalau elemen-elemen ini ada di halaman
  const info = getAdminInfo();
  if (info) {
    const nameEl = document.getElementById('adminName');
    const avatarEl = document.getElementById('adminAvatar');
    if (nameEl) nameEl.textContent = info.namaLengkap || info.username || 'Admin';
    if (avatarEl) avatarEl.textContent = (info.namaLengkap || info.username || 'A').charAt(0).toUpperCase();
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_STORAGE);
    localStorage.removeItem(ADMIN_INFO_STORAGE);
    window.location.href = 'admin-login.html';
  });
}