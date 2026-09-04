-- Migration: Create donasi_transaksi table for Admin Pusat
-- Date: 2026-09-03

CREATE TABLE IF NOT EXISTS donasi_transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pengirim TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    jumlah_transaksi_masuk REAL NOT NULL DEFAULT 0,
    jumlah_transaksi_keluar REAL NOT NULL DEFAULT 0,
    keterangan TEXT NOT NULL DEFAULT 'donasi masuk',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
