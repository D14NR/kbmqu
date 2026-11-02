-- Migration 007: Update donasi_transaksi schema with hidden_nama_pengirim and jenis_transaksi
-- Table definition requested:
-- CREATE TABLE donasi_transaksi (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     nama_pengirim TEXT NOT NULL,
--     tanggal TEXT NOT NULL,
--     jumlah_transaksi_masuk REAL NOT NULL DEFAULT 0,
--     jumlah_transaksi_keluar REAL NOT NULL DEFAULT 0,
--     keterangan TEXT NOT NULL DEFAULT 'donasi masuk',
--     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     hidden_nama_pengirim INTEGER NOT NULL DEFAULT 0,
--     jenis_transaksi TEXT NOT NULL DEFAULT 'Dana Masuk'
-- );
--
-- Pilihan kategori yang bisa digunakan:
-- - Dana Masuk
-- - Dana Keluar
-- - Pembayaran Tagihan
-- - Pembelian
-- - Operasional
-- - Lainnya

-- ALTER TABLE statements for existing SQLite/D1 database:
ALTER TABLE donasi_transaksi ADD COLUMN hidden_nama_pengirim INTEGER NOT NULL DEFAULT 0;
ALTER TABLE donasi_transaksi ADD COLUMN jenis_transaksi TEXT NOT NULL DEFAULT 'Dana Masuk';
