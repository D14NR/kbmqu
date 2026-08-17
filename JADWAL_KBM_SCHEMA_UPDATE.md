# Update Skema Jadwal KBM (Menu Hapus Jadwal)

## Deskripsi
Skema database untuk tabel `jadwal_kbm` telah diperbarui untuk menyertakan field timestamp `created_at` dan `updated_at` sesuai dengan spesifikasi yang ditetapkan. Perubahan ini memastikan Menu Hapus Jadwal menggunakan data dengan tracking waktu yang lengkap.

## Skema Baru
```sql
CREATE TABLE jadwal_kbm (
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
)
```

## Perubahan yang Dilakukan

### 1. **Database Schema Mapping** (`src/lib/database.ts`)
   - ✅ Updated `jadwalKbmSchema.fromDb` untuk membaca field `created_at` dan `updated_at` dari database
   - ✅ Updated `jadwalKbmSchema.toDb` untuk:
     - Menyimpan `created_at` dengan nilai dari input atau timestamp saat ini (jika baru)
     - Menyimpan `updated_at` dengan timestamp saat ini (auto-update pada setiap perubahan)
   - ✅ Schema ini digunakan oleh ketiga bucket: `jadwal_reguler`, `jadwal_khusus`, dan `jadwal_kbm`

### 2. **Field Mapping**

| Database | UI/Code | Tipe | Deskripsi |
|----------|---------|------|-----------|
| `id` | (auto) | TEXT | Primary key UUID |
| `cabang` | `Cabang` | TEXT | Nama cabang |
| `kelas` | `Kelas` | TEXT | Kelas/Rombel |
| `sekolah` | `Sekolah` | TEXT | Sekolah (opsional) |
| `jenjang_studi` | `Jenjang Studi` | TEXT | Jenjang pendidikan |
| `tanggal` | `Tanggal` | TEXT | Tanggal jadwal (YYYY-MM-DD) |
| `mata_pelajaran` | `Mapel` | TEXT | Mata pelajaran |
| `kode_pengajar` | `Kode Pengajar` | TEXT | Kode pengajar |
| `nama_pengajar` | `Nama Pengajar` | TEXT | Nama pengajar |
| `waktu` | `Waktu` | TEXT | Waktu/jam pelajaran |
| `bulan` | `Bulan` | TEXT | Bulan jadwal (YYYY-MM) |
| `class_order` | `Urutan Kelas` | INTEGER | Urutan kelas (opsional) |
| `gabung` | `Gabung` | TEXT | Keterangan gabung (opsional) |
| `jenis_kbm` | `Jenis KBM` | TEXT | Jenis: 'Reguler' atau 'Khusus' |
| `is_gabung` | `IsGabung` | INTEGER | Flag gabung (0 atau 1) |
| `created_at` | `CreatedAt` | TEXT | Waktu pembuatan (ISO 8601) |
| `updated_at` | `UpdatedAt` | TEXT | Waktu update terakhir (ISO 8601) |

## Langkah-Langkah Implementasi

### Step 1: Update Database D1
Jalankan salah satu dari 3 opsi SQL yang tersedia di `migrations/002_update_jadwal_kbm_schema.sql`:

**Opsi 1** (Rekomendasi untuk database baru):
```sql
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
    jenis_kbm TEXT NOT NULL CHECK (jenis_kbm IN ('Reguler', 'Khusus')),
    is_gabung INTEGER NOT NULL DEFAULT 0 CHECK (is_gabung IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

**Opsi 2** (Jika tabel sudah ada):
```sql
ALTER TABLE jadwal_kbm ADD COLUMN created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

ALTER TABLE jadwal_kbm ADD COLUMN updated_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
```

**Opsi 3** (Jika perlu recreate table dengan data preservation):
Lihat file `migrations/002_update_jadwal_kbm_schema.sql` untuk script lengkap.

### Step 2: Deploy Aplikasi
- Aplikasi TypeScript sudah diperbarui untuk handle schema baru
- Jalankan `npm run build` untuk compile
- Deploy ke Cloudflare Workers

## Dampak pada Menu Hapus Jadwal

### Fungsionalitas yang Didukung
- ✅ Hapus jadwal berdasarkan bulan (jadwal reguler atau tambahan)
- ✅ Tracking waktu pembuatan dan perubahan data
- ✅ Sinkronisasi otomatis dengan Surat Tugas Mengajar
- ✅ Validasi jenis jadwal (Reguler/Khusus)
- ✅ Filtering berdasarkan gabung kelas

### Fitur Timestamp
- **created_at**: Tidak berubah setelah record dibuat
- **updated_at**: Otomatis diupdate setiap kali ada perubahan (termasuk soft delete info jika diperlukan)

## Kompatibilitas

- ✅ Backward compatible dengan fitur-fitur yang ada
- ✅ Tidak perlu perubahan di UI komponen `HapusJadwalView`
- ✅ Timestamp tersimpan otomatis tanpa intervensi pengguna
- ✅ Tetap kompatibel dengan Schedule Table View dan Print Jadwal

## Testing

1. Akses menu Admin → Hapus Jadwal
2. Pilih jenis jadwal (Reguler atau Tambahan)
3. Pilih bulan yang akan dihapus
4. Klik tombol "Hapus Data Jadwal"
5. Verifikasi record di database memiliki `created_at` dan `updated_at`
6. Verify Surat Tugas Mengajar ter-sinkronisasi

## Catatan Penting

- Format timestamp menggunakan ISO 8601 format: `YYYY-MM-DDTHH:MM:ss.sssZ`
- Timezone menggunakan UTC (Z suffix)
- Jika Ada data lama tanpa timestamp, akan diisi otomatis dengan waktu saat ini
- Semua operasi CREATE/UPDATE akan otomatis mengisi timestamp
- Ketika data dihapus melalui Menu Hapus Jadwal, timestamp `updated_at` akan mencerminkan waktu penghapusan

## Files yang Diubah

1. `src/lib/database.ts` - Updated schema mapping untuk `jadwal_kbm` (dan derivative buckets)
2. `migrations/002_update_jadwal_kbm_schema.sql` - Migration script untuk database D1

## Dukungan

Jika ada pertanyaan atau masalah:
1. Verifikasi D1 database sudah di-update dengan schema baru
2. Check browser console untuk error messages
3. Verifikasi network requests di DevTools
4. Pastikan `jenis_kbm` values hanya 'Reguler' atau 'Khusus'
5. Verifikasi `is_gabung` hanya bernilai 0 atau 1
