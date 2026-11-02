-- Migration: Create donasi_transaksi_tagihan table for Menu Transaksi Tagihan
-- Date: 2026-10-31

-- ==============================================================================
-- Opsi 1 (Disarankan untuk SQLite / Cloudflare D1 jika ID menggunakan UUID string)
-- Dalam SQLite / D1, agar id dapat menyimpan string UUID (misal: "c3e98124-7f1a-4d22-8b9a-1c0989d21ef0")
-- tipe kolom id harus bertipe TEXT PRIMARY KEY:
-- ==============================================================================
CREATE TABLE IF NOT EXISTS donasi_transaksi_tagihan (
    id TEXT PRIMARY KEY,
    nama_pengirim TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    jumlah_tagihan REAL NOT NULL DEFAULT 0,
    keterangan TEXT NOT NULL DEFAULT 'tagihan bulan ini',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Belum Dibayar',
    is_lunas INTEGER DEFAULT 0,
    tanggal_bayar TEXT
);

-- ==============================================================================
-- Opsi 2 (Sesuai Skema Asli dengan AUTOINCREMENT jika D1 menggunakan integer)
-- ==============================================================================
-- CREATE TABLE IF NOT EXISTS donasi_transaksi_tagihan (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     nama_pengirim TEXT NOT NULL,
--     tanggal TEXT NOT NULL,
--     jumlah_tagihan REAL NOT NULL DEFAULT 0,
--     keterangan TEXT NOT NULL DEFAULT 'tagihan bulan ini',
--     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     status TEXT DEFAULT 'Belum Dibayar',
--     is_lunas INTEGER DEFAULT 0,
--     tanggal_bayar TEXT
-- );

-- ==============================================================================
-- Skrip Migrasi jika tabel lama sudah ada (Menambahkan kolom status, is_lunas, tanggal_bayar)
-- ==============================================================================
-- ALTER TABLE donasi_transaksi_tagihan ADD COLUMN status TEXT DEFAULT 'Belum Dibayar';
-- ALTER TABLE donasi_transaksi_tagihan ADD COLUMN is_lunas INTEGER DEFAULT 0;
-- ALTER TABLE donasi_transaksi_tagihan ADD COLUMN tanggal_bayar TEXT;
