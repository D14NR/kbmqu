# Skema Database: mata_pelajaran

Tabel `mata_pelajaran` menyimpan master data kurikulum mata pelajaran dan kategorinya.

```sql
CREATE TABLE mata_pelajaran (
    id TEXT PRIMARY KEY NOT NULL,
    kode_mata_pelajaran TEXT NOT NULL UNIQUE,
    mata_pelajaran TEXT NOT NULL,
    kategory TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
);
```

### Kategori yang Didukung:
- `SNBT`
- `TKA`
- `KEDINASAN`
- `UMUM`
- `Lainnya` (Kategori Kustom)
