-- =====================================================================
-- TAMBAHAN untuk schema.sql Anda — tabel Izin Penelitian
-- Jalankan bagian ini di database yang sama (bappelitbangda_pkl)
-- =====================================================================

USE bappelitbangda_pkl;

CREATE TABLE IF NOT EXISTS penelitian (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number       VARCHAR(40)  NOT NULL UNIQUE,
  nama_peneliti       VARCHAR(150) NOT NULL,
  instansi            VARCHAR(200) NOT NULL,
  nim_nip             VARCHAR(50),                    -- opsional, peneliti mandiri boleh kosong
  judul_penelitian    VARCHAR(255) NOT NULL,
  lokasi_penelitian   VARCHAR(255) NOT NULL,
  no_hp               VARCHAR(30)  NOT NULL,
  email               VARCHAR(150) NOT NULL,
  tanggal_mulai       DATE NOT NULL,
  tanggal_selesai     DATE NOT NULL,
  proposal_url        TEXT,          -- link Google Drive proposal penelitian
  surat_pengantar_url TEXT,          -- link Google Drive surat pengantar
  ktp_url             TEXT,          -- link Google Drive scan KTP
  catatan             TEXT,
  status              ENUM('Menunggu Verifikasi', 'Diverifikasi', 'Ditolak', 'Selesai')
                        NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Log perubahan status (sama seperti ajuan_status_log, tapi untuk penelitian)
CREATE TABLE IF NOT EXISTS penelitian_status_log (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  penelitian_id INT UNSIGNED NOT NULL,
  status_lama   VARCHAR(40),
  status_baru   VARCHAR(40) NOT NULL,
  catatan_admin TEXT,
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (penelitian_id) REFERENCES penelitian(id) ON DELETE CASCADE
) ENGINE=InnoDB;