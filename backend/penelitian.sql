-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 05, 2026 at 06:34 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bappelitbangda_pkl`
--

-- --------------------------------------------------------

--
-- Table structure for table `penelitian`
--

CREATE TABLE `penelitian` (
  `id` int UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ticket_number` varchar(40) NOT NULL UNIQUE,
  `nama_peneliti` varchar(150) NOT NULL,
  `instansi` varchar(200) NOT NULL,
  `nim_nip` varchar(50),
  `judul_penelitian` varchar(255) NOT NULL,
  `lokasi_penelitian` varchar(255) NOT NULL,
  `no_hp` varchar(30) NOT NULL,
  `email` varchar(150) NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `proposal_url` text DEFAULT NULL,
  `surat_pengantar_url` text DEFAULT NULL,
  `ktp_url` text DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `status` enum('Menunggu Verifikasi','Diverifikasi','Ditolak','Selesai') NOT NULL DEFAULT 'Menunggu Verifikasi',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
);

--
-- Dumping data for table `penelitian`
--

INSERT INTO `penelitian` (`id`, `ticket_number`, `nama_peneliti`, `instansi`, `nim_nip`, `judul_penelitian`, `lokasi_penelitian`, `no_hp`, `email`, `tanggal_mulai`, `tanggal_selesai`, `proposal_url`, `surat_pengantar_url`, `ktp_url`, `catatan`, `status`, `created_at`, `updated_at`) VALUES
(4, 'TSM-LIT-202608-3054', 'dewkdjj', 'sdsfsdfsf', '2894983409809380', 'fhgfhghjgk', 'fgchgcgcfc', '0834913213', 'syirlie13@gmail.com', '2026-08-05', '2026-08-05', 'https://drive.google.com/file/d/1PVimZAGz4qlK_xYvZ0Zy2BtYtH7fQ-4z/view?usp=drivesdk', 'https://drive.google.com/file/d/1AZbiyc0KaUe3V8Qen7wozpBLIwKVd4hL/view?usp=drivesdk', 'https://drive.google.com/file/d/100A_CB4ZEQaWoxpE1TkGZRYPLDv7LG6x/view?usp=drivesdk', NULL, 'Menunggu Verifikasi', '2026-08-05 04:23:21', '2026-08-05 04:23:21');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `penelitian`
--
ALTER TABLE `penelitian`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_number` (`ticket_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `penelitian`
--
ALTER TABLE `penelitian`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;


/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
