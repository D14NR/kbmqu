-- Migration: Update jadwal_kbm table schema to include timestamps
-- Date: 2026-08-16

-- OPTION 1: If table doesn't exist, create it with the new schema
CREATE TABLE IF NOT EXISTS jadwal_kbm (
    id TEXT PRIMARY KEY NOT NULL,
    
    cabang TEXT NOT NULL,
    kelas TEXT NOT NULL,
    sekolah TEXT NOT NULL DEFAULT '',
    jenjang_studi TEXT,
    
    tanggal TEXT NOT NULL,
    
    mata_pelajaran TEXT NOT NULL,
    
    kode_pengajar TEXT NOT NULL,
    nama_pengajar TEXT NOT NULL,
    
    waktu TEXT NOT NULL,
    bulan TEXT NOT NULL,
    
    class_order INTEGER,
    
    gabung TEXT DEFAULT '',
    
    jenis_kbm TEXT NOT NULL
        CHECK (jenis_kbm IN ('Reguler', 'Khusus')),
    
    is_gabung INTEGER NOT NULL DEFAULT 0
        CHECK (is_gabung IN (0, 1)),
    
    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    
    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
);

-- OPTION 2: If table already exists, add missing columns
-- Uncomment the following lines if the table already exists without these columns:

-- ALTER TABLE jadwal_kbm ADD COLUMN created_at TEXT NOT NULL DEFAULT (
--     strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
-- );
-- 
-- ALTER TABLE jadwal_kbm ADD COLUMN updated_at TEXT NOT NULL DEFAULT (
--     strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
-- );

-- OPTION 3: Complete table recreation (use if modifying existing table)
-- This will recreate the table with the correct schema
-- WARNING: Only use this if you want to preserve existing data but fix schema issues

-- BEGIN;
-- 
-- -- Create new table with correct schema
-- CREATE TABLE jadwal_kbm_new (
--     id TEXT PRIMARY KEY NOT NULL,
--     
--     cabang TEXT NOT NULL,
--     kelas TEXT NOT NULL,
--     sekolah TEXT NOT NULL DEFAULT '',
--     jenjang_studi TEXT,
--     
--     tanggal TEXT NOT NULL,
--     
--     mata_pelajaran TEXT NOT NULL,
--     
--     kode_pengajar TEXT NOT NULL,
--     nama_pengajar TEXT NOT NULL,
--     
--     waktu TEXT NOT NULL,
--     bulan TEXT NOT NULL,
--     
--     class_order INTEGER,
--     
--     gabung TEXT DEFAULT '',
--     
--     jenis_kbm TEXT NOT NULL
--         CHECK (jenis_kbm IN ('Reguler', 'Khusus')),
--     
--     is_gabung INTEGER NOT NULL DEFAULT 0
--         CHECK (is_gabung IN (0, 1)),
--     
--     created_at TEXT NOT NULL DEFAULT (
--         strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--     ),
--     
--     updated_at TEXT NOT NULL DEFAULT (
--         strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--     )
-- );
-- 
-- -- Copy existing data
-- INSERT INTO jadwal_kbm_new (id, cabang, kelas, sekolah, jenjang_studi, tanggal, mata_pelajaran, 
--                             kode_pengajar, nama_pengajar, waktu, bulan, class_order, gabung, 
--                             jenis_kbm, is_gabung, created_at, updated_at)
-- SELECT 
--     id,
--     cabang,
--     kelas,
--     sekolah,
--     jenjang_studi,
--     tanggal,
--     mata_pelajaran,
--     kode_pengajar,
--     nama_pengajar,
--     waktu,
--     bulan,
--     class_order,
--     gabung,
--     jenis_kbm,
--     is_gabung,
--     COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
--     COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
-- FROM jadwal_kbm;
-- 
-- -- Drop old table
-- DROP TABLE jadwal_kbm;
-- 
-- -- Rename new table
-- ALTER TABLE jadwal_kbm_new RENAME TO jadwal_kbm;
-- 
-- COMMIT;
