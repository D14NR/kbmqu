-- Migration: Create donasi table for Admin Pusat
-- Date: 2026-09-03

CREATE TABLE IF NOT EXISTS donasi (
    id TEXT PRIMARY KEY,
    nama_pemilik TEXT,
    nama_bank TEXT,
    alamat_rekening TEXT,
    nominal_terkumpul REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
