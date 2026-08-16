# Update Skema Libur Nasional

## Deskripsi
Skema database untuk tabel `libur_nasional` telah diperbarui untuk menyertakan field timestamp `created_at` dan `updated_at` seperti yang ditetapkan.

## Skema Baru
```sql
CREATE TABLE libur_nasional (
    id TEXT PRIMARY KEY NOT NULL,
    tanggal TEXT NOT NULL,
    keterangan_libur TEXT,
    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
)
```

## Perubahan yang Dilakukan

### 1. **Database Schema Mapping** (`src/lib/database.ts`)
   - ✅ Updated `fromDb` untuk membaca field `created_at` dan `updated_at` dari database
   - ✅ Updated `toDb` untuk:
     - Menyimpan `created_at` dengan nilai dari input atau timestamp saat ini (jika baru)
     - Menyimpan `updated_at` dengan timestamp saat ini (auto-update pada setiap perubahan)

## Langkah-Langkah Implementasi

### Step 1: Update Database D1
Jalankan salah satu dari 3 opsi SQL yang tersedia di `migrations/001_update_libur_nasional_schema.sql`:

**Opsi 1** (Rekomendasi untuk database baru):
```sql
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
```

**Opsi 2** (Jika tabel sudah ada):
```sql
ALTER TABLE libur_nasional ADD COLUMN created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

ALTER TABLE libur_nasional ADD COLUMN updated_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
```

**Opsi 3** (Jika perlu recreate table dengan data preservation):
Lihat file `migrations/001_update_libur_nasional_schema.sql` untuk script lengkap.

### Step 2: Deploy Aplikasi
- Aplikasi TypeScript sudah diperbarui untuk handle schema baru
- Jalankan `npm run build` untuk compile
- Deploy ke Cloudflare Workers

## Fitur-Fitur

### Timestamp Otomatis
- **created_at**: Secara otomatis diisi saat record dibuat (tidak berubah setelahnya)
- **updated_at**: Secara otomatis di-update setiap kali record dimodifikasi

### Kompatibilitas Backward
- Aplikasi tetap kompatibel dengan view yang ada
- `HolidaysAdminView.tsx` akan terus berfungsi normal
- Field timestamp disimpan otomatis tanpa perlu perubahan di UI

## Testing

1. Buat libur nasional baru melalui UI
2. Verifikasi field `created_at` dan `updated_at` terisi di database
3. Edit libur nasional yang ada
4. Verifikasi `updated_at` berubah sementara `created_at` tetap sama

## Field Mapping

| Database | UI/Code | Tipe | Deskripsi |
|----------|---------|------|-----------|
| `id` | `ID` | TEXT | Primary key UUID |
| `tanggal` | `Tanggal` | TEXT | Tanggal libur (YYYY-MM-DD) |
| `keterangan_libur` | `Keterangan` | TEXT | Deskripsi/nama libur |
| `created_at` | `CreatedAt` | TEXT | Waktu pembuatan (ISO 8601) |
| `updated_at` | `UpdatedAt` | TEXT | Waktu perubahan terakhir (ISO 8601) |

## Catatan Penting

- Format timestamp menggunakan ISO 8601 format: `YYYY-MM-DDTHH:MM:ss.sssZ`
- Timezone menggunakan UTC (Z suffix)
- Jika Ada data lama tanpa timestamp, akan diisi otomatis dengan waktu saat ini
- Semua operasi CREATE/UPDATE akan otomatis mengisi timestamp

## Files yang Diubah

1. `src/lib/database.ts` - Updated schema mapping untuk `libur_nasional`
2. `migrations/001_update_libur_nasional_schema.sql` - Migration script

## Dukungan

Jika ada pertanyaan atau masalah, periksa:
1. Verifikasi D1 database sudah di-update dengan schema baru
2. Check browser console untuk error messages
3. Verifikasi network requests di DevTools
