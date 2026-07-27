-- =====================================================================
-- Skema database: Layanan Ajuan Magang & PKL + Penelitian
-- Bappelitbangda Kab. Tasikmalaya
-- =====================================================================

CREATE DATABASE IF NOT EXISTS bappelitbangda_pkl
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bappelitbangda_pkl;

-- ============================================================
-- TABEL EXISTING: Ajuan Magang / PKL
-- ============================================================
CREATE TABLE IF NOT EXISTS ajuan (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number       VARCHAR(40)  NOT NULL UNIQUE,
  jenis               ENUM('Magang', 'PKL') NOT NULL,
  nama_lengkap        VARCHAR(150) NOT NULL,
  nim_nisn            VARCHAR(50)  NOT NULL,
  instansi            VARCHAR(200) NOT NULL,
  program_studi       VARCHAR(150) NOT NULL,
  no_hp               VARCHAR(30)  NOT NULL,
  email               VARCHAR(150) NOT NULL,
  tanggal_mulai       DATE NOT NULL,
  tanggal_selesai     DATE NOT NULL,
  bidang_tujuan       VARCHAR(150) NOT NULL,
  surat_pengantar_url TEXT,
  catatan             TEXT,
  status              ENUM('Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai')
                        NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_jenis (jenis),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABEL EXISTING: Log status ajuan
-- ============================================================
CREATE TABLE IF NOT EXISTS ajuan_status_log (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ajuan_id      INT UNSIGNED NOT NULL,
  status_lama   VARCHAR(40),
  status_baru   VARCHAR(40) NOT NULL,
  catatan_admin TEXT,
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ajuan_id) REFERENCES ajuan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- ✨ NEW: TABEL PENELITIAN / SKP
-- ============================================================
CREATE TABLE IF NOT EXISTS penelitian (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number       VARCHAR(40)  NOT NULL UNIQUE,
  
  -- Data Pemohon
  nama_lengkap        VARCHAR(150) NOT NULL,
  nim_nisn            VARCHAR(50)  NOT NULL,
  instansi            VARCHAR(200) NOT NULL,
  program_studi       VARCHAR(150) NOT NULL,
  no_hp               VARCHAR(30)  NOT NULL,
  email               VARCHAR(150) NOT NULL,
  
  -- Data Penelitian
  judul_penelitian    VARCHAR(255) NOT NULL,
  tujuan_penelitian   TEXT,
  lokasi_penelitian   VARCHAR(255),
  dosen_pembimbing    VARCHAR(150),
  
  -- Periode
  tanggal_mulai       DATE NOT NULL,
  tanggal_selesai     DATE NOT NULL,
  
  -- Dokumen
  surat_pengantar_url TEXT,
  proposal_url        TEXT,
  
  catatan             TEXT,
  status              ENUM('Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai')
                        NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- ✨ NEW: Log status penelitian
-- ============================================================
CREATE TABLE IF NOT EXISTS penelitian_status_log (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  penelitian_id INT UNSIGNED NOT NULL,
  status_lama   VARCHAR(40),
  status_baru   VARCHAR(40) NOT NULL,
  catatan_admin TEXT,
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (penelitian_id) REFERENCES penelitian(id) ON DELETE CASCADE
) ENGINE=InnoDB;