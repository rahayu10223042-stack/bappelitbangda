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
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permohonan_id   INT UNSIGNED NOT NULL,
  status_lama     VARCHAR(40),
  status_baru     VARCHAR(40) NOT NULL,
  catatan_admin   TEXT,
  changed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan_informasi(id) ON DELETE CASCADE
) ENGINE=InnoDB;