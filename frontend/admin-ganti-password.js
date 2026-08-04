// =========================================================
// BAPPELITBANGDA — Khusus halaman admin-ganti-password.html
// Butuh admin-common.js dimuat lebih dulu.
// =========================================================
const changePasswordForm = document.getElementById('changePasswordForm');

if (changePasswordForm) {
  const changeError = document.getElementById('changeError');
  const changeSuccess = document.getElementById('changeSuccess');
  const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

  changePasswordForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    changeError.classList.remove('show');
    changeError.style.display = 'none';
    changeSuccess.style.display = 'none';

    if (!changePasswordForm.checkValidity()) {
      changePasswordForm.reportValidity();
      return;
    }

    const oldPassword = changePasswordForm.oldPassword.value;
    const newPassword = changePasswordForm.newPassword.value;
    const confirmPassword = changePasswordForm.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      changeError.textContent = 'Password baru dan ulangi password tidak sama.';
      changeError.style.display = 'block';
      changeError.classList.add('show');
      return;
    }

    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/change-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (response.status === 401 || response.status === 403) return handleAuthFailure();

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal mengubah password.');
      }

      changeSuccess.style.display = 'block';
      showToast('Password berhasil diubah.');
      changePasswordForm.reset();

      setTimeout(() => {
        localStorage.removeItem('bplb_admin_token');
        localStorage.removeItem('bplb_admin_info');
        window.location.href = 'admin-login.html';
      }, 2500);

    } catch (err) {
      console.error(err);
      changeError.textContent = err.message || 'Gagal mengubah password. Coba lagi.';
      changeError.style.display = 'block';
      changeError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}