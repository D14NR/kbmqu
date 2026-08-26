-- Migration 003: Update schema for mata_pelajaran table to include kategory field

CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id TEXT PRIMARY KEY NOT NULL,
    kode_mata_pelajaran TEXT NOT NULL UNIQUE,
    mata_pelajaran TEXT NOT NULL,
    kategory TEXT NOT NULL DEFAULT 'UMUM',
    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
);

-- In case table already exists without kategory column:
-- ALTER TABLE mata_pelajaran ADD COLUMN kategory TEXT NOT NULL DEFAULT 'UMUM';
