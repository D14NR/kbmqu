# Update Skema Menu Transaksi Tagihan (`donasi_transaksi_tagihan`)

## 1. Definisi Skema Tabel

Menu **Transaksi Tagihan** kini telah diperbarui dan sepenuhnya menggunakan skema:

```sql
CREATE TABLE donasi_transaksi_tagihan (
    id TEXT PRIMARY KEY,                       -- UUID v4 string (misal: "c3e98124-7f1a-4d22-8b9a-1c0989d21ef0")
    nama_pengirim TEXT NOT NULL,               -- Nama pengirim / vendor tagihan server
    tanggal TEXT NOT NULL,                     -- Tanggal & waktu invoice tagihan
    jumlah_tagihan REAL NOT NULL DEFAULT 0,    -- Nominal tagihan server
    keterangan TEXT NOT NULL DEFAULT 'tagihan bulan ini',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Belum Dibayar',       -- 'Belum Dibayar' | 'Sudah Dibayar'
    is_lunas INTEGER DEFAULT 0,                -- 0 (Belum Bayar) | 1 (Lunas)
    tanggal_bayar TEXT                         -- Tanggal & waktu pembayaran tagihan
);
```

> **Catatan Penting Penggunaan UUID pada SQLite / Cloudflare D1:**  
> Di SQLite / Cloudflare D1, jika kolom `id` didefinisikan sebagai `INTEGER PRIMARY KEY AUTOINCREMENT`, SQLite secara ketat menolak string alfanumerik (UUID) dan akan memicu error `SQLITE_MISMATCH`. Oleh karena itu, agar ID dapat menggunakan format UUID string secara native, kolom `id` menggunakan tipe `TEXT PRIMARY KEY`.  
> Sistem proxy aplikasi juga telah dilengkapi penanganan kompatibilitas ganda (*backward-compatibility*): jika database D1 masih menggunakan integer autoincrement, sistem secara otomatis menangani fallback nomor id tanpa memicu error, dan jika tabel telah dimigrasi ke `TEXT PRIMARY KEY`, UUID disimpan secara langsung.

---

## 2. Fitur & Penyesuaian yang Diterapkan

1. **Dukungan Penuh Kolom Baru**:
   - `status`: `'Belum Dibayar'` atau `'Sudah Dibayar'`.
   - `is_lunas`: `0` (Belum lunas) atau `1` (Lunas).
   - `tanggal_bayar`: Menyimpan tanggal dan waktu ketika tagihan dilunasi.
2. **Generasi ID UUID**:
   - Pembuatan tagihan baru secara otomatis menghasilkan UUID v4 (`crypto.randomUUID()`).
   - Tampilan UI di tabel menampilkan id ringkas dengan tooltip ID lengkap.
3. **Pencatatan Pembayaran & Tanda Sudah Dibayar**:
   - Tombol **Bayar** di tabel tagihan secara otomatis mencatat pengeluaran di `donasi_transaksi` dan memperbarui status tagihan menjadi **"Sudah Dibayar"**, `is_lunas = 1`, dan `tanggal_bayar = waktu saat ini`.
   - Tombol **Tandai Status** (ikon centang / undo) untuk mengubah status lunas secara instan dari tabel tanpa perlu membuka modal.
   - Modal Form Tagihan dilengkapi pilihan status (`Belum Dibayar` / `Sudah Dibayar`) serta input `Tanggal Bayar`.
4. **Filter & Pelaporan**:
   - Filter cepat tagihan: `Semua`, `Belum Bayar`, dan `Lunas`.
   - Rekap jumlah tagihan dan status tagihan lunas/belum lunas di Banner Pemeliharaan Database & Ringkasan Kas.
