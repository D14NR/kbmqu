-- Migration: Update libur_nasional table schema to include timestamps
-- Date: 2026-08-16

-- OPTION 1: If table doesn't exist, create it with the new schema
CREATE TABLE IF NOT EXISTS libur_nasional (
    id TEXT PRIMARY KEY NOT NULL,
    tanggal TEXT NOT NULL,
    keterangan_libur TEXT,
    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
);

-- OPTION 2: If table already exists, add missing columns
-- Uncomment the following lines if the table already exists without these columns:

-- ALTER TABLE libur_nasional ADD COLUMN created_at TEXT NOT NULL DEFAULT (
--     strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
-- );
-- 
-- ALTER TABLE libur_nasional ADD COLUMN updated_at TEXT NOT NULL DEFAULT (
--     strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
-- );

-- OPTION 3: Complete table recreation (use if modifying existing table)
-- This will recreate the table with the correct schema
-- WARNING: Only use this if you want to preserve existing data but fix schema issues

-- BEGIN;
-- 
-- -- Create new table with correct schema
-- CREATE TABLE libur_nasional_new (
--     id TEXT PRIMARY KEY NOT NULL,
--     tanggal TEXT NOT NULL,
--     keterangan_libur TEXT,
--     created_at TEXT NOT NULL DEFAULT (
--         strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--     ),
--     updated_at TEXT NOT NULL DEFAULT (
--         strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--     )
-- );
-- 
-- -- Copy existing data
-- INSERT INTO libur_nasional_new (id, tanggal, keterangan_libur, created_at, updated_at)
-- SELECT 
--     id,
--     tanggal,
--     keterangan_libur,
--     COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
--     COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
-- FROM libur_nasional;
-- 
-- -- Drop old table
-- DROP TABLE libur_nasional;
-- 
-- -- Rename new table
-- ALTER TABLE libur_nasional_new RENAME TO libur_nasional;
-- 
-- COMMIT;
