-- =====================================================================
-- TAMBAHAN skema — tabel Layanan Permohonan dan Informasi
-- (mencakup: Permohonan Informasi, Pengaduan, dan Konsultasi dalam satu form)
-- Jalankan di database yang sama (bappelitbangda_pkl)
-- =====================================================================
USE bappelitbangda_pkl;

CREATE TABLE IF NOT EXISTS permohonan_informasi (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nomor_registrasi  VARCHAR(40)  NOT NULL UNIQUE,
  tanggal           DATE NOT NULL,
  nama_pemohon      VARCHAR(150) NOT NULL,
  instansi          VARCHAR(200),
  no_hp             VARCHAR(30)  NOT NULL,
  email             VARCHAR(150) NOT NULL,
  jenis_layanan     ENUM('Permohonan Informasi', 'Pengaduan', 'Konsultasi') NOT NULL,
  uraian            TEXT NOT NULL,
  status            ENUM('Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai')
                      NOT NULL DEFAULT 'Menunggu Verifikasi',
  catatan_admin     TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_status (status),
  INDEX idx_jenis (jenis_layanan),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Log perubahan status (mengikuti pola tabel lain)
CREATE TABLE IF NOT EXISTS permohonan_status_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permohonan_id INT NOT NULL,
  status_lama VARCHAR(50) NULL,
  status_baru VARCHAR(50) NOT NULL,
  catatan_admin TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
); ENGINE=InnoDB;